/**
 * Shared agent types — used internally by agent implementations.
 */
import type { AgentType, AgentRunStatus, Citation } from "@forager/shared";

export interface AgentContext {
  tenantId: string;
  triggeredBy: string;
  model: string;
}

export interface AgentResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  sources: Citation[];
  confidence: number;
  tokensUsed: number;
  durationMs: number;
}
