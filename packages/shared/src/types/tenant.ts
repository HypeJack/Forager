/**
 * Tenant — Multi-tenant root entity.
 * Every row in the system belongs to exactly one tenant.
 */
export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string;
  settings: TenantSettings;
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface TenantSettings {
  /** Allowed grant categories for this org */
  grant_categories: string[];
  /** Maximum concurrent agent runs */
  max_concurrent_runs: number;
  /** Feature flags */
  features: Record<string, boolean>;
}

/**
 * TenantPlan — Determines model routing tier.
 * 'industry' → claude-opus-4-7 for first drafts.
 * 'nonprofit' | 'free' → claude-sonnet-4-6.
 */
export type TenantPlan = 'free' | 'nonprofit' | 'industry';

