/**
 * architectStream — Inngest function
 *
 * Triggered by: architect/draft.requested
 * Payload: { applicationId, sectionId, tenantId, plan }
 *
 * Streaming Architecture:
 *   1. Librarian retrieves hybrid search context from vault.
 *   2. Architect streams a section via Anthropic streaming API.
 *   3. Tokens are broadcast ephemerally to Supabase Realtime channel
 *      `architect:{applicationId}` — NO tokens are written to the database.
 *   4. When the section is fully complete, a single DB UPDATE is performed
 *      on grant_applications.outline[sectionId].content.
 */

import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { streamLLM } from "@forager/orchestration";
import { hybridSearchVault, updateSectionContent, updateApplicationStatus, getApplication } from "@forager/db";
import type { TenantPlan } from "@forager/shared";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Broadcast helpers ──────────────────────────────────────────

async function broadcastToken(
  applicationId: string,
  token: string
): Promise<void> {
  // Supabase Realtime Broadcast — ephemeral, zero DB writes
  await supabase.channel(`architect:${applicationId}`).send({
    type: "broadcast",
    event: "token",
    payload: { token },
  });
}

async function broadcastSectionComplete(
  applicationId: string,
  sectionId: string
): Promise<void> {
  await supabase.channel(`architect:${applicationId}`).send({
    type: "broadcast",
    event: "section_complete",
    payload: { sectionId },
  });
}

async function broadcastDraftComplete(applicationId: string): Promise<void> {
  await supabase.channel(`architect:${applicationId}`).send({
    type: "broadcast",
    event: "draft_complete",
    payload: { applicationId },
  });
}

// ── Inngest Function ───────────────────────────────────────────

export const architectStream = inngest.createFunction(
  {
    id: "architect-stream",
    retries: 1,
    // Timeout per section: 5 minutes
    timeouts: { finish: "5m" },
  },
  { event: "architect/draft.requested" },
  async ({ event, step }) => {
    const { applicationId, sectionId, tenantId, plan } = event.data as {
      applicationId: string;
      sectionId: string;
      tenantId: string;
      plan: TenantPlan;
    };

    // Step 1: Load application + section context
    const application = await step.run("load-application", async () => {
      return getApplication(supabase as any, applicationId);
    });

    if (!application) throw new Error(`Application not found: ${applicationId}`);

    const section = application.outline.find((s) => s.id === sectionId);
    if (!section) throw new Error(`Section not found: ${sectionId}`);

    // Mark as drafting
    await step.run("mark-drafting", async () => {
      await supabase
        .from("grant_applications")
        .update({ status: "drafting", current_section: sectionId })
        .eq("id", applicationId);
    });

    // Step 2: Librarian — hybrid retrieval
    const librarianContext = await step.run("librarian-retrieval", async () => {
      // Embed the section title to find relevant vault content
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: section.title,
        dimensions: 1536,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      return hybridSearchVault(
        supabase as any,
        section.title,
        queryEmbedding,
        tenantId,
        { matchCount: 5, vectorWeight: 0.6, ftsWeight: 0.4 }
      );
    });

    // Step 3: Build system prompt — with voice context if enabled
    const systemPrompt = await step.run("build-system-prompt", async () => {
      const provenanceContext = librarianContext
        .map(
          (r, i) =>
            `[Source ${i + 1}: ${r.documentTitle}]\n${r.content}`
        )
        .join("\n\n---\n\n");

      // Voice matching: pull prior winning proposals from vault if enabled
      let voiceContext = "";
      if (application.match_prior_voice) {
        const priorProposals = librarianContext.filter((r) =>
          r.documentTitle.toLowerCase().includes("grant") ||
          r.documentTitle.toLowerCase().includes("proposal") ||
          r.documentTitle.toLowerCase().includes("application")
        );
        if (priorProposals.length > 0) {
          voiceContext = `\n\nVOICE REFERENCE (from prior winning proposals — match this organization's tone, voice, and vocabulary exactly):\n${priorProposals.map((p) => p.content).join("\n\n")}`;
        }
      }

      return `You are the Forager Architect agent. Your task is to draft the "${section.title}" section of a grant proposal.

RULES:
- Write in the organization's authentic voice and tone.
- Every factual claim MUST cite a vault source using the exact format: [[Source: Document Title]]
- Do not fabricate statistics, programs, or outcomes — only use evidence from the vault context below.
- Write in clear, compelling prose using Source Serif 4 typographic rhythm (long sentences, paragraph breaks, no bullet points).
- Target 300-500 words for this section.

VAULT CONTEXT (retrieved by the Librarian):
${provenanceContext}${voiceContext}`;
    });

    // Step 4: Stream the section via Anthropic + broadcast to Realtime
    const completedSection = await step.run("stream-section", async () => {
      let fullText = "";
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Token buffer: broadcast every ~10 tokens to avoid rate-limiting Realtime
      let buffer = "";
      let bufferCount = 0;
      const BUFFER_FLUSH_SIZE = 8;

      const streamRequest = streamLLM({
        task: "architect_first_draft",
        plan,
        system: systemPrompt,
        prompt: `Draft the "${section.title}" section now.`,
        temperature: 0.4,
      });

      for await (const chunk of streamRequest) {
        if (chunk.isDone) {
          // Flush remaining buffer
          if (buffer) {
            await broadcastToken(applicationId, buffer);
            buffer = "";
          }
          totalInputTokens = chunk.inputTokens ?? 0;
          totalOutputTokens = chunk.outputTokens ?? 0;
          break;
        }

        fullText += chunk.token;
        buffer += chunk.token;
        bufferCount++;

        if (bufferCount >= BUFFER_FLUSH_SIZE) {
          await broadcastToken(applicationId, buffer);
          buffer = "";
          bufferCount = 0;
        }
      }

      await broadcastSectionComplete(applicationId, sectionId);

      return { text: fullText, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
    });

    // Step 5: Persist completed section to DB (single write per section)
    await step.run("persist-section", async () => {
      await updateSectionContent(
        supabase as any,
        applicationId,
        sectionId,
        completedSection.text,
        completedSection.inputTokens + completedSection.outputTokens
      );
    });

    // Step 6: Check if all sections are complete
    await step.run("check-completion", async () => {
      const updated = await getApplication(supabase as any, applicationId);
      if (!updated) return;

      const allComplete = updated.outline.every((s) => s.status === "complete");
      if (allComplete) {
        await updateApplicationStatus(supabase as any, applicationId, "complete");
        await broadcastDraftComplete(applicationId);
      }
    });

    return {
      applicationId,
      sectionId,
      wordCount: completedSection.text.split(/\s+/).length,
    };
  }
);
