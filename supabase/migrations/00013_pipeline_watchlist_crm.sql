-- Migration: 00013_pipeline_watchlist_crm
-- Updates grant_opportunities for the Pipeline and Watchlist. Creates crm_sync_logs for Liaison.

-- 1. Ensure status enum matches Kanban requirements
-- Current statuses in types: "discovered" | "screening" | "matched" | "drafting" | "submitted" | "awarded" | "rejected" | "archived"
-- The Pipeline Kanban columns: Discovered → Evaluating (screening/matched) → Drafting → Submitted → Closed (awarded/rejected)
-- We'll just ensure the DB allows these text statuses (it already does as TEXT column without check, or we can add a check if needed, but keeping it flexible for now).

-- 2. Add Watchlist, Saved, Dismissed vectors to grant_opportunities
ALTER TABLE grant_opportunities
  ADD COLUMN IF NOT EXISTS is_watchlist BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_saved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN NOT NULL DEFAULT false;

-- 3. Milestones tracking JSONB
ALTER TABLE grant_opportunities
  ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '{"released": null, "webinar": null, "qa": null, "loi": null, "full_proposal": null}';

-- 4. Liaison CRM mock table
CREATE TABLE crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES grant_opportunities(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL, -- 'status_update', 'submission_summary', 'decision_ack'
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_sync_logs_tenant ON crm_sync_logs (tenant_id);

ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for crm logs"
  ON crm_sync_logs FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
