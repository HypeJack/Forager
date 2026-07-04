/**
 * Grant-related types for opportunities, applications, and match results.
 */

export type GrantStatus =
  | "discovered"
  | "screening"
  | "matched"
  | "drafting"
  | "submitted"
  | "awarded"
  | "rejected"
  | "archived";

export interface GrantOpportunity {
  id: string;
  tenant_id: string;
  title: string;
  funder: string;
  description: string;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null; // ISO 8601
  url: string;
  status: GrantStatus;
  tags: string[];
  metadata: Record<string, unknown>;
  relevance_score?: number | null;
  relevance_rationale?: string | null;
  scored_at?: string | null;
  scoring_model?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantMatch {
  id: string;
  tenant_id: string;
  opportunity_id: string;
  score: number; // 0–100
  rationale: string;
  evidence: Citation[];
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

/**
 * Citation — Provenance record for agent-generated content.
 * Every agent output must include source-cited evidence.
 */
export interface Citation {
  source: string; // URL or document reference
  excerpt: string; // Relevant quote or passage
  relevance: string; // Why this citation supports the claim
  page?: number;
  section?: string;
}
