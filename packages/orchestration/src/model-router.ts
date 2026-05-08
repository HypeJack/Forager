import type { TenantPlan } from '@forager/shared/types/tenant';

export type Provider = 'anthropic' | 'google' | 'openai';

export type AgentTask =
  // Scout
  | 'scout_eligibility_analysis'
  | 'scout_match_scoring'
  | 'scout_agentic_browse'
  // Librarian
  | 'librarian_synthesis'
  | 'librarian_embedding'
  // Architect
  | 'architect_first_draft'
  | 'architect_section_revision'
  // Liaison
  | 'liaison_qa_response'
  | 'liaison_summary'
  // Evals
  | 'eval_judge';

export interface ModelSelection {
  provider: Provider;
  model: string;
  failoverProvider?: Provider;
  failoverModel?: string;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  maxContextTokens: number;
  supportsTools: boolean;
  useAdvisorTool?: boolean;
}

export function selectModel(task: AgentTask, plan: TenantPlan = 'free'): ModelSelection {
  switch (task) {
    // ── Scout ──────────────────────────────────────────────────
    case 'scout_eligibility_analysis':
    case 'scout_match_scoring':
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        failoverProvider: 'google',
        failoverModel: 'gemini-2.5-pro',
        costPerMillionInput: 3,
        costPerMillionOutput: 15,
        maxContextTokens: 200_000,
        supportsTools: true,
      };

    case 'scout_agentic_browse':
      return {
        provider: 'google',
        model: 'gemini-2.5-pro',
        failoverProvider: 'anthropic',
        failoverModel: 'claude-sonnet-4-6',
        costPerMillionInput: 1.25,
        costPerMillionOutput: 10,
        maxContextTokens: 1_000_000,
        supportsTools: true,
      };

    // ── Librarian ──────────────────────────────────────────────
    case 'librarian_synthesis':
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        failoverProvider: 'google',
        failoverModel: 'gemini-2.5-pro',
        costPerMillionInput: 3,
        costPerMillionOutput: 15,
        maxContextTokens: 200_000,
        supportsTools: false,
      };

    case 'librarian_embedding':
      return {
        provider: 'openai',
        model: 'text-embedding-3-small',
        costPerMillionInput: 0.02,
        costPerMillionOutput: 0,
        maxContextTokens: 8_191,
        supportsTools: false,
      };

    // ── Architect ──────────────────────────────────────────────
    // Industry plan first drafts: claude-opus-4-7
    // Nonprofit/Free plans and all revisions: claude-sonnet-4-6
    case 'architect_first_draft':
      if (plan === 'industry') {
        return {
          provider: 'anthropic',
          model: 'claude-opus-4-7',
          failoverProvider: 'anthropic',
          failoverModel: 'claude-sonnet-4-6',
          costPerMillionInput: 15,
          costPerMillionOutput: 75,
          maxContextTokens: 200_000,
          supportsTools: true,
          useAdvisorTool: true,
        };
      }
      // Nonprofit / Free
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        failoverProvider: 'google',
        failoverModel: 'gemini-2.5-pro',
        costPerMillionInput: 3,
        costPerMillionOutput: 15,
        maxContextTokens: 200_000,
        supportsTools: true,
      };

    case 'architect_section_revision':
      // Always Sonnet — revisions do not escalate to Opus
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        failoverProvider: 'google',
        failoverModel: 'gemini-2.5-pro',
        costPerMillionInput: 3,
        costPerMillionOutput: 15,
        maxContextTokens: 200_000,
        supportsTools: true,
      };

    // ── Liaison ────────────────────────────────────────────────
    case 'liaison_qa_response':
    case 'liaison_summary':
      return {
        provider: 'anthropic',
        model: 'claude-haiku-4-5', // Updated to Haiku as requested
        costPerMillionInput: 0.8,
        costPerMillionOutput: 4.0,
        maxContextTokens: 200_000,
        supportsTools: true,
      };

    // ── Evals ──────────────────────────────────────────────────
    case 'eval_judge':
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6', // Updated from Opus to Sonnet as requested
        costPerMillionInput: 3,
        costPerMillionOutput: 15,
        maxContextTokens: 200_000,
        supportsTools: false,
      };
  }
}

export function estimateCallCost(
  selection: ModelSelection,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * selection.costPerMillionInput;
  const outputCost = (outputTokens / 1_000_000) * selection.costPerMillionOutput;
  return inputCost + outputCost;
}
