/**
 * processVaultDocument — Inngest function
 *
 * Triggered when a new document is uploaded to the vault.
 * Pipeline: Parse → Chunk → Embed → Store in vault_chunks
 *
 * Event: "vault/document.uploaded"
 * Payload: { documentId: string, tenantId: string }
 */

import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Chunking Configuration ─────────────────────────────────────

const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters

/**
 * Recursive character text splitter.
 * Splits on paragraph boundaries first, then sentences, then words.
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const separators = ["\n\n", "\n", ". ", " "];

  function split(content: string, separatorIndex: number): string[] {
    if (content.length <= CHUNK_SIZE) return [content];
    if (separatorIndex >= separators.length) {
      // Hard split at CHUNK_SIZE
      const result: string[] = [];
      for (let i = 0; i < content.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        result.push(content.slice(i, i + CHUNK_SIZE));
      }
      return result;
    }

    const sep = separators[separatorIndex];
    const parts = content.split(sep);
    const result: string[] = [];
    let current = "";

    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (candidate.length > CHUNK_SIZE && current) {
        result.push(current);
        // Overlap: keep the tail of the previous chunk
        const overlap = current.slice(-CHUNK_OVERLAP);
        current = overlap + sep + part;
      } else {
        current = candidate;
      }
    }
    if (current) result.push(current);

    // Recursively split any oversized chunks
    return result.flatMap((chunk) =>
      chunk.length > CHUNK_SIZE
        ? split(chunk, separatorIndex + 1)
        : [chunk]
    );
  }

  return split(text.trim(), 0).filter((c) => c.trim().length > 0);
}

// ── Inngest Function ───────────────────────────────────────────

export const processVaultDocument = inngest.createFunction(
  {
    id: "process-vault-document",
    retries: 3,
  },
  { event: "vault/document.uploaded" },
  async ({ event, step }) => {
    const { documentId, tenantId } = event.data;

    // Step 1: Fetch document metadata
    const doc = await step.run("fetch-document", async () => {
      const { data, error } = await supabase
        .from("vault_documents")
        .select("*")
        .eq("id", documentId)
        .eq("tenant_id", tenantId)
        .single();

      if (error || !data) throw new Error(`Document not found: ${documentId}`);
      return data;
    });

    // Step 2: Download and parse document content
    const rawText = await step.run("parse-document", async () => {
      const { data, error } = await supabase.storage
        .from("vault-documents")
        .download(doc.file_path);

      if (error || !data) throw new Error(`Failed to download: ${doc.file_path}`);

      let text = "";
      const isPdf = doc.file_type === "application/pdf" || doc.file_path.toLowerCase().endsWith(".pdf");

      try {
        if (isPdf) {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Import pdf-parse dynamically to avoid top-level bundle issues
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(buffer);
          text = parsed.text || "";
        } else {
          text = await data.text();
        }
      } catch (err) {
        console.error("Parse error:", err);
        text = ""; // Empty text will trigger the failure flow below
      }

      return text.trim();
    });

    // Handle extraction failures without retrying forever
    if (!rawText) {
      await step.run("mark-failed", async () => {
        await supabase.from("vault_documents").update({ status: "failed" }).eq("id", documentId);
      });
      return { documentId, status: "failed", reason: "Text extraction failed or empty" };
    }

    // Step 3: Chunk the text
    const chunks = await step.run("chunk-text", async () => {
      return chunkText(rawText);
    });

    // Step 4: Generate embeddings with OpenAI
    const embeddings = await step.run("generate-embeddings", async () => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
      }
      
      const { OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Batch process chunks to respect API limits (100 at a time)
      const results: number[][] = [];
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
          dimensions: 1536,
        });
        
        // Ensure order matches the input batch
        const batchEmbeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);
          
        results.push(...batchEmbeddings);
      }
      
      return results;
    });

    // Step 5: Store chunks in vault_chunks with embeddings
    await step.run("store-chunks", async () => {
      const rows = chunks.map((content, i) => ({
        document_id: documentId,
        tenant_id: tenantId,
        content,
        chunk_index: i,
        embedding: embeddings[i],
      }));

      const { error } = await supabase
        .from("vault_chunks")
        .insert(rows);

      if (error) throw new Error(`Failed to store chunks: ${error.message}`);
    });

    // Step 6: Update document status
    await step.run("update-status", async () => {
      const { error } = await supabase
        .from("vault_documents")
        .update({
          status: "indexed",
          chunk_count: chunks.length,
        })
        .eq("id", documentId);

      if (error) throw new Error(`Failed to update status: ${error.message}`);
    });

    return {
      documentId,
      chunksCreated: chunks.length,
      status: "indexed",
    };
  }
);
