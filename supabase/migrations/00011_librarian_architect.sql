-- Migration: 00011_librarian_architect
-- Adds FTS to vault_chunks and creates the grant_applications table.
-- NO application_streams table — streaming uses Supabase Realtime Broadcast (ephemeral).

-- ── 1. FTS on vault_chunks ─────────────────────────────────────

-- Add a generated tsvector column for English full-text search
ALTER TABLE vault_chunks
  ADD COLUMN IF NOT EXISTS fts_content TSVECTOR
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- GIN index for fast FTS queries
CREATE INDEX IF NOT EXISTS idx_vault_chunks_fts
  ON vault_chunks USING GIN (fts_content);

-- ── 2. grant_applications ─────────────────────────────────────

CREATE TABLE grant_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id    UUID NOT NULL REFERENCES grant_opportunities(id) ON DELETE CASCADE,

  -- Pre-draft configuration
  outline           JSONB NOT NULL DEFAULT '[]',
  -- outline shape: [{ id, title, status: 'pending'|'drafting'|'complete', content: null|string }]

  match_prior_voice BOOLEAN NOT NULL DEFAULT true,
  -- When true, Architect uses prior winning proposals from the Vault as voice context

  -- Draft state
  current_section   TEXT,
  -- Architect broadcast channel: `architect:${id}` (ephemeral — no DB storage)

  status            TEXT NOT NULL DEFAULT 'pre_draft'
    CHECK (status IN ('pre_draft', 'drafting', 'paused', 'complete', 'submitted')),

  -- Submission tracking (three strict choices)
  submitted_via     TEXT
    CHECK (submitted_via IN ('portal', 'manual', 'final') OR submitted_via IS NULL),
  submitted_at      TIMESTAMPTZ,

  -- Token cost tracking per run
  total_tokens_used INTEGER NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ -- Soft delete
);

CREATE INDEX idx_applications_tenant
  ON grant_applications (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_applications_status
  ON grant_applications (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON grant_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── RLS ────────────────────────────────────────────────────────

ALTER TABLE grant_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for applications"
  ON grant_applications FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
