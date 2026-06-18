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

    // Step 2: Extract and store initial chunks (without embeddings)
    const chunkCount = await step.run("extract-and-store-chunks", async () => {
      const { data, error } = await supabase.storage
        .from("vault-documents")
        .download(doc.file_path);

      if (error || !data) throw new Error(`Failed to download: ${doc.file_path}`);

      let text = "";
      const pathLower = doc.file_path.toLowerCase();

      try {
        if (pathLower.endsWith(".pdf") || doc.file_type === "application/pdf") {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Import pdf-parse dynamically to avoid top-level bundle issues
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(buffer);
          text = parsed.text || "";
        } else if (pathLower.endsWith(".docx") || doc.file_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const arrayBuffer = await data.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Import mammoth dynamically
          const mammoth = (await import("mammoth")).default;
          const parsed = await mammoth.extractRawText({ buffer });
          text = parsed.value || "";
        } else if (pathLower.endsWith(".txt") || pathLower.endsWith(".md") || doc.file_type.startsWith("text/")) {
          text = await data.text();
        } else {
          throw new Error(`Unsupported file type: ${doc.file_type}`);
        }

        // Binary Guard: Check if the text is actually binary garbage
        if (text.includes('\x00') || text.includes('PK\x03\x04')) {
          throw new Error("Binary/unparseable content detected");
        }
      } catch (err) {
        console.error("Parse error:", err);
        text = ""; // Empty text will trigger the failure flow below
      }

      // Strip null bytes and non-whitespace control characters that Postgres rejects
      const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      const rawText = sanitized.trim();
      
      if (!rawText) return 0; // Trigger mark-failed

      // Chunk the text
      const chunks = chunkText(rawText);

      // Store initial chunks without embeddings
      const rows = chunks.map((content, i) => ({
        document_id: documentId,
        tenant_id: tenantId,
        content,
        chunk_index: i,
        // embedding is explicitly omitted (NULL)
      }));

      // Insert in manageable batches for DB health (e.g., 500 rows at a time)
      const INSERT_BATCH_SIZE = 500;
      for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
        const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
        const { error: insertError } = await supabase.from("vault_chunks").insert(batch);
        if (insertError) throw new Error(`Failed to store initial chunks: ${insertError.message}`);
      }

      return chunks.length;
    });

    // Handle extraction failures without retrying forever
    if (chunkCount === 0) {
      await step.run("mark-failed", async () => {
        await supabase.from("vault_documents").update({ status: "failed" }).eq("id", documentId);
      });
      return { documentId, status: "failed", reason: "Text extraction failed or empty" };
    }

    // Step 3: Embed and update chunks in batches
    const BATCH_SIZE = 50; // Smaller batch keeps state low and executes quickly
    const numBatches = Math.ceil(chunkCount / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      await step.run(`embed-batch-${batchIndex}`, async () => {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error("Missing OPENAI_API_KEY environment variable");
        }

        const offset = batchIndex * BATCH_SIZE;
        // Fetch chunks for this batch
        const { data: batchChunks, error: fetchError } = await supabase
          .from("vault_chunks")
          .select("id, content")
          .eq("document_id", documentId)
          .order("chunk_index", { ascending: true })
          .range(offset, offset + BATCH_SIZE - 1);

        if (fetchError || !batchChunks || batchChunks.length === 0) {
          throw new Error(`Failed to fetch chunks for batch ${batchIndex}`);
        }

        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batchChunks.map((c) => c.content),
          dimensions: 1536,
        });

        // Ensure order matches the input batch
        const batchEmbeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        // Update each chunk with its embedding concurrently
        await Promise.all(
          batchChunks.map((chunk, j) =>
            supabase
              .from("vault_chunks")
              .update({ embedding: JSON.stringify(batchEmbeddings[j]) })
              .eq("id", chunk.id)
          )
        );

        return { processed: batchChunks.length };
      });
    }

    // Step 4: Update document status
    await step.run("update-status", async () => {
      const { error } = await supabase
        .from("vault_documents")
        .update({
          status: "indexed",
          chunk_count: chunkCount,
        })
        .eq("id", documentId);

      if (error) throw new Error(`Failed to update status: ${error.message}`);
    });

    return {
      documentId,
      chunksCreated: chunkCount,
      status: "indexed",
    };
  }
);
