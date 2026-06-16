/**
 * Agent run types — Tracks execution of agentic workflows.
 */

export type AgentType = "scout" | "librarian" | "architect" | "liaison";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentRun {
  id: string;
  tenant_id: string;
  agent_type: AgentType;
  status: AgentRunStatus;
  input: Record<string, unknown>;
  output: AgentOutput | null;
  error: string | null;
  model: string; // e.g., "gpt-4o", "claude-sonnet-4"
  tokens_used: number;
  duration_ms: number | null;
  triggered_by: string; // user_id or "system"
  created_at: string;
  completed_at: string | null;
}

export interface AgentOutput {
  /** Primary result payload — shape varies by agent type */
  result: Record<string, unknown>;
  /** All sources cited in this output */
  sources: import("./grant.js").Citation[];
  /** Confidence score 0–1 */
  confidence: number;
  /** Chain-of-thought reasoning (optional, for debugging) */
  reasoning?: string;
}
