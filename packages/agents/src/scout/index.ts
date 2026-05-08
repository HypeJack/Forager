/**
 * Scout v1 — Grant discovery and matching agent.
 *
 * Architecture:
 * - Receives an org profile + optional filters
 * - Discovers relevant grant opportunities
 * - Scores each opportunity against the org profile
 * - Returns ranked results with provenance citations
 *
 * Designed for execution via Inngest for retry semantics and observability.
 */

import { ScoutInputSchema, ScoutOutputSchema } from "./schema.js";
import { SCOUT_SYSTEM_PROMPT, SCOUT_SCORING_PROMPT } from "./prompts.js";
import type { ScoutInput, ScoutOutput } from "./schema.js";
import type { AgentContext, AgentResult } from "../types.js";

export class ScoutAgent {
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Execute the scout workflow.
   * Currently a stub — will be connected to LLM provider in Sprint 2.
   */
  async run(rawInput: unknown): Promise<AgentResult<ScoutOutput>> {
    const startTime = Date.now();

    // 1. Validate input
    const parseResult = ScoutInputSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return {
        success: false,
        data: null,
        error: `Invalid input: ${parseResult.error.message}`,
        sources: [],
        confidence: 0,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
      };
    }

    const input = parseResult.data;

    try {
      // 2. Discovery phase (stub — will call LLM in Sprint 2)
      const opportunities = await this.discover(input);

      // 3. Scoring phase (stub — will call LLM in Sprint 2)
      const scoredOpportunities = await this.score(input, opportunities);

      // 4. Build output
      const output: ScoutOutput = {
        opportunities: scoredOpportunities,
        total_evaluated: scoredOpportunities.length,
        model: this.context.model,
        search_summary: `Scout v1 evaluated ${scoredOpportunities.length} opportunities for ${input.orgProfile.name}. This is a scaffold run — connect LLM provider to enable live discovery.`,
      };

      // 5. Validate output
      const outputValidation = ScoutOutputSchema.safeParse(output);
      if (!outputValidation.success) {
        return {
          success: false,
          data: null,
          error: `Output validation failed: ${outputValidation.error.message}`,
          sources: [],
          confidence: 0,
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: outputValidation.data,
        error: null,
        sources: scoredOpportunities.flatMap((o) =>
          o.evidence.map((e) => ({
            source: e.source,
            excerpt: e.excerpt,
            relevance: e.relevance,
          }))
        ),
        confidence: 0.95,
        tokensUsed: 0, // Will be populated when LLM is connected
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        sources: [],
        confidence: 0,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Discovery phase — find relevant opportunities.
   * Stub: Returns empty array. Will query data sources + LLM in Sprint 2.
   */
  private async discover(
    _input: ScoutInput
  ): Promise<ScoutOutput["opportunities"]> {
    // TODO: Sprint 2 — Connect to grants.gov API, Foundation Directory, etc.
    // TODO: Sprint 2 — Use LLM for semantic search and relevance filtering
    return [];
  }

  /**
   * Scoring phase — evaluate and rank opportunities.
   * Stub: Pass-through. Will use LLM scoring in Sprint 2.
   */
  private async score(
    _input: ScoutInput,
    opportunities: ScoutOutput["opportunities"]
  ): Promise<ScoutOutput["opportunities"]> {
    // TODO: Sprint 2 — Use LLM to score each opportunity against org profile
    return opportunities;
  }
}
