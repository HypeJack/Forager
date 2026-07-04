-- Migration: 00001_create_tenants
-- Creates the tenants table — root entity for multi-tenant isolation.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{
    "grant_categories": [],
    "max_concurrent_runs": 3,
    "features": {}
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for slug lookups
CREATE INDEX idx_tenants_slug ON tenants (slug);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- Migration: 00002_create_users
-- Users table — scoped to a tenant, with role-based access.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  avatar_url TEXT,
  last_sign_in TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique email per tenant
CREATE UNIQUE INDEX idx_users_tenant_email ON users (tenant_id, email);

-- Tenant lookup index
CREATE INDEX idx_users_tenant_id ON users (tenant_id);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- Migration: 00003_create_grants
-- Grant opportunities and match results tables.

CREATE TABLE grant_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_min NUMERIC,
  amount_max NUMERIC,
  deadline TIMESTAMPTZ,
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (
    status IN ('discovered', 'screening', 'matched', 'drafting', 'submitted', 'awarded', 'rejected', 'archived')
  ),
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grants_tenant_id ON grant_opportunities (tenant_id);
CREATE INDEX idx_grants_status ON grant_opportunities (tenant_id, status);
CREATE INDEX idx_grants_deadline ON grant_opportunities (tenant_id, deadline) WHERE deadline IS NOT NULL;

CREATE TRIGGER set_grants_updated_at
  BEFORE UPDATE ON grant_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant matches — scored results from agent evaluation
CREATE TABLE grant_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES grant_opportunities(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_tenant_id ON grant_matches (tenant_id);
CREATE INDEX idx_matches_opportunity ON grant_matches (opportunity_id);
CREATE INDEX idx_matches_score ON grant_matches (tenant_id, score DESC);
-- Migration: 00004_create_agent_runs
-- Tracks all agentic workflow executions for observability and audit.

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('scout', 'strategist', 'writer', 'reviewer')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  model TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_runs_tenant_id ON agent_runs (tenant_id);
CREATE INDEX idx_agent_runs_status ON agent_runs (tenant_id, status);
CREATE INDEX idx_agent_runs_type ON agent_runs (tenant_id, agent_type);
CREATE INDEX idx_agent_runs_created ON agent_runs (tenant_id, created_at DESC);
-- Migration: 00005_enable_rls
-- Enable Row Level Security on all tables.
-- Policies enforce tenant isolation: users can only access rows matching their tenant_id.

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
-- Users can only see their own tenant
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Users can only see users in their tenant
CREATE POLICY "Users can view own tenant users"
  ON users FOR SELECT
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Grant opportunities scoped to tenant
CREATE POLICY "Tenant isolation for grants"
  ON grant_opportunities FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Grant matches scoped to tenant
CREATE POLICY "Tenant isolation for matches"
  ON grant_matches FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Agent runs scoped to tenant
CREATE POLICY "Tenant isolation for agent runs"
  ON agent_runs FOR ALL
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Service role bypass (for agent backend)
-- The service_role key bypasses RLS by default in Supabase.
-- No additional policy needed for server-side agent operations.
-- Migration: 00006_add_pgvector
-- Enable pgvector extension for embedding storage.

CREATE EXTENSION IF NOT EXISTS vector;
-- Migration: 00007_create_org_profiles
-- Organization profile for each tenant — drives Scout agent matching.

CREATE TABLE org_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  mission TEXT NOT NULL DEFAULT '',
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  annual_budget NUMERIC,
  location TEXT NOT NULL DEFAULT '',
  org_type TEXT NOT NULL DEFAULT 'nonprofit' CHECK (
    org_type IN ('nonprofit', 'government', 'tribal', 'education', 'other')
  ),
  ein TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_org_profiles_updated_at
  BEFORE UPDATE ON org_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE org_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for org profiles"
  ON org_profiles FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
-- Migration: 00008_create_vault_tables
-- Vault documents and chunks with pgvector embeddings.
-- Both tables enforce soft deletes via deleted_at.

-- ── vault_documents ────────────────────────────────────────────

CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN ('processing', 'indexed', 'failed')
  ),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete: NULL = active, non-NULL = deleted
);

CREATE INDEX idx_vault_docs_tenant ON vault_documents (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vault_docs_status ON vault_documents (tenant_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER set_vault_documents_updated_at
  BEFORE UPDATE ON vault_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── vault_chunks ───────────────────────────────────────────────

CREATE TABLE vault_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small dimensions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete: NULL = active, non-NULL = deleted
);

CREATE INDEX idx_vault_chunks_document ON vault_chunks (document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vault_chunks_tenant ON vault_chunks (tenant_id) WHERE deleted_at IS NULL;

-- Similarity search index (IVFFlat) — created only after data exists
-- CREATE INDEX idx_vault_chunks_embedding ON vault_chunks
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- ── RLS ────────────────────────────────────────────────────────

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for vault documents"
  ON vault_documents FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for vault chunks"
  ON vault_chunks FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
-- Migration: 00009_similarity_search_rpc
-- RPC for Vault RAG using pgvector cosine similarity (<=>).

CREATE OR REPLACE FUNCTION match_vault_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.document_id,
    vc.content,
    1 - (vc.embedding <=> query_embedding) AS similarity
  FROM vault_chunks vc
  WHERE vc.tenant_id = p_tenant_id
    AND vc.deleted_at IS NULL
    AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
-- Migration: 00010_grant_matches_scoring
-- Extend grant_matches table and add RPC to trigger Scout agent.

-- 1. Add Scout output columns to grant_matches
ALTER TABLE grant_matches
  ADD COLUMN eligibility_rationale TEXT,
  ADD COLUMN scout_model TEXT,
  ADD COLUMN vault_context_used JSONB;

-- 2. Add trigger RPC for the frontend to start the Inngest workflow
CREATE OR REPLACE FUNCTION trigger_scout_run(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  run_id UUID;
  event_key TEXT;
  response JSONB;
BEGIN
  -- Insert the pending agent run
  INSERT INTO agent_runs (tenant_id, agent_type, status, triggered_by)
  VALUES (p_tenant_id, 'scout', 'queued', auth.uid()::text)
  RETURNING id INTO run_id;

  -- Read the Inngest event key from vault secrets
  SELECT secret INTO event_key FROM vault.decrypted_secrets WHERE name = 'inngest_event_key';
  
  -- If secret doesn't exist, we'll gracefully fallback or rely on server-side triggers in production.
  -- For local development, this function expects the secret to be set.
  IF event_key IS NULL THEN
    RETURN jsonb_build_object('error', 'inngest_event_key missing in vault secrets', 'run_id', run_id);
  END IF;

  -- We would typically do an HTTP POST to Inngest here using pg_net, 
  -- but for this MVP, the frontend can also just insert into `agent_runs` 
  -- and a Postgres trigger or backend listener can emit the event.
  -- Since we want pure Supabase -> Inngest without a middle server, 
  -- we return the run_id, and let the caller know it was queued.
  
  RETURN jsonb_build_object('success', true, 'run_id', run_id);
END;
$$;
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
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Migration: 00012_librarian_hybrid_search
-- Hybrid vector + FTS retrieval for the Librarian agent.
-- Every result carries document provenance: document_id + document title.

CREATE OR REPLACE FUNCTION hybrid_search_vault(
  query_text        TEXT,       -- Raw text query (used for FTS)
  query_embedding   VECTOR(1536), -- Embedded query vector (used for cosine sim)
  p_tenant_id       UUID,
  match_count       INT DEFAULT 5,
  -- Weights: 0.0 = pure FTS, 1.0 = pure vector. Default: balanced.
  vector_weight     FLOAT DEFAULT 0.6,
  fts_weight        FLOAT DEFAULT 0.4,
  similarity_floor  FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id      UUID,
  document_id   UUID,
  document_title TEXT,
  content       TEXT,
  vector_score  FLOAT,
  fts_score     FLOAT,
  hybrid_score  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      vc.id                                            AS chunk_id,
      vc.document_id,
      vc.content,
      1 - (vc.embedding <=> query_embedding)           AS v_score
    FROM vault_chunks vc
    WHERE vc.tenant_id = p_tenant_id
      AND vc.deleted_at IS NULL
      AND vc.embedding IS NOT NULL
      AND 1 - (vc.embedding <=> query_embedding) > similarity_floor
  ),
  fts_results AS (
    SELECT
      vc.id                                            AS chunk_id,
      vc.document_id,
      vc.content,
      ts_rank_cd(vc.fts_content, query)                AS f_score
    FROM vault_chunks vc,
         websearch_to_tsquery('english', query_text) query
    WHERE vc.tenant_id = p_tenant_id
      AND vc.deleted_at IS NULL
      AND vc.fts_content @@ query
  ),
  combined AS (
    SELECT
      COALESCE(vr.chunk_id, fr.chunk_id)     AS chunk_id,
      COALESCE(vr.document_id, fr.document_id) AS document_id,
      COALESCE(vr.content, fr.content)        AS content,
      COALESCE(vr.v_score, 0.0)               AS vector_score,
      COALESCE(fr.f_score, 0.0)               AS fts_score,
      (COALESCE(vr.v_score, 0.0) * vector_weight) +
      (COALESCE(fr.f_score, 0.0) * fts_weight) AS hybrid_score
    FROM vector_results vr
    FULL OUTER JOIN fts_results fr ON vr.chunk_id = fr.chunk_id
  )
  SELECT
    c.chunk_id,
    c.document_id,
    vd.title                                          AS document_title,
    c.content,
    c.vector_score,
    c.fts_score,
    c.hybrid_score
  FROM combined c
  JOIN vault_documents vd ON vd.id = c.document_id
  WHERE vd.deleted_at IS NULL
  ORDER BY c.hybrid_score DESC
  LIMIT match_count;
END;
$$;
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
-- Migration: 00014_budget_tracking
-- Implements hard budget caps at the database level to guarantee cost containment.

-- 1. Extend tenants table with plan and spend tracking
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'nonprofit', 'industry')),
  ADD COLUMN IF NOT EXISTS current_month_spend NUMERIC(10, 4) NOT NULL DEFAULT 0;

-- 2. Budget Cap Lookup Function
CREATE OR REPLACE FUNCTION get_tenant_budget_cap(p_plan TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN CASE 
    WHEN p_plan = 'free' THEN 10.00
    WHEN p_plan = 'nonprofit' THEN 100.00
    WHEN p_plan = 'industry' THEN 200.00
    ELSE 0.00
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. Before-Insert Trigger: Block agent runs if budget exceeded
CREATE OR REPLACE FUNCTION check_tenant_budget_before_run()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_spend NUMERIC;
  v_cap NUMERIC;
BEGIN
  SELECT plan, current_month_spend INTO v_plan, v_spend 
  FROM tenants WHERE id = NEW.tenant_id;

  v_cap := get_tenant_budget_cap(v_plan);

  IF v_spend >= v_cap THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED: Monthly budget cap of $% reached for plan %', v_cap, v_plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_budget
  BEFORE INSERT ON agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_budget_before_run();

-- 4. After-Update Trigger: Record cost upon completion
-- This assumes model-router logic is mirrored or accessible. 
-- For the prototype, we use a simplified version of estimateCallCost.

CREATE OR REPLACE FUNCTION update_tenant_spend_after_run()
RETURNS TRIGGER AS $$
DECLARE
  v_cost NUMERIC;
  v_input_price NUMERIC;
  v_output_price NUMERIC;
BEGIN
  -- Simplified price lookup based on model-router.ts
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.tokens_used > 0 THEN
    -- Default to Sonnet pricing for simplicity in SQL logic
    v_input_price := 3.0 / 1000000;
    v_output_price := 15.0 / 1000000;
    
    -- Heuristic: assume 30/70 split if only total tokens available
    v_cost := NEW.tokens_used * v_output_price; 

    UPDATE tenants 
    SET current_month_spend = current_month_spend + v_cost
    WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_spend
  AFTER UPDATE ON agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_spend_after_run();
-- Migration: 00015_performance_hardening
-- Implements HNSW indexing for pgvector to optimize Librarian retrieval latency.

-- 1. HNSW Index for Vector Search
-- Uses 1536 dimensions (OpenAI) with cosine similarity
CREATE INDEX IF NOT EXISTS idx_vault_chunks_embedding_hnsw 
ON vault_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. Index for tenant-scoped lookups on frequently queried agent logs
CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant_created 
ON agent_runs (tenant_id, created_at DESC);

-- 3. GIN index for outline JSONB search
CREATE INDEX IF NOT EXISTS idx_grant_applications_outline_gin 
ON grant_applications USING GIN (outline);
-- Migration: 00017_agent_naming_alignment

DO $$
DECLARE
    const_name text;
BEGIN
    SELECT conname INTO const_name
    FROM pg_constraint
    WHERE conrelid = 'agent_runs'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%agent_type%';
    
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE agent_runs DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_agent_type_check 
  CHECK (agent_type IN ('scout', 'librarian', 'architect', 'liaison'));
-- Migration: 00018_magic_link_auth
-- Sets up allowlist, relaxes tenant_id, and creates the auth.users trigger for auto-tenant assignment.

-- 1. Create allowlist table
CREATE TABLE allowlisted_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Relax users.tenant_id to allow waitlisted users
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;

-- 3. Trigger function to handle new auth users
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  is_allowlisted BOOLEAN;
BEGIN
  -- Check if user is allowlisted
  SELECT EXISTS(
    SELECT 1 FROM allowlisted_emails WHERE email = NEW.email
  ) INTO is_allowlisted;

  IF is_allowlisted THEN
    -- Auto-create tenant
    INSERT INTO tenants (name, slug, plan)
    VALUES ('Workspace', 'workspace-' || floor(extract(epoch from now()))::text, 'nonprofit')
    RETURNING id INTO new_tenant_id;

    -- Auto-create org_profile
    INSERT INTO org_profiles (tenant_id, name)
    VALUES (new_tenant_id, 'Workspace');

    -- Insert public user as owner
    INSERT INTO users (id, tenant_id, email, full_name, role)
    VALUES (NEW.id, new_tenant_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'owner');
  ELSE
    -- Waitlisted user: no tenant, viewer role
    INSERT INTO users (id, tenant_id, email, full_name, role)
    VALUES (NEW.id, NULL, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'viewer');
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Attach trigger to auth.users
-- Note: auth schema triggers need to be created by a superuser, which migrations run as.
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created();

-- Migration: 00019_fix_rls_recursion
-- Fix infinite recursion in users RLS and optimize tenant isolation policies.

-- 1. Create a helper function to get the current user's tenant_id bypassing RLS
-- SECURITY DEFINER allows it to read public.users without triggering RLS.
-- search_path is locked to public to prevent search path injection attacks.
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- 2. Add policy for users to read their own row (breaks recursion for simple lookups)
CREATE POLICY "users_read_own" 
  ON public.users FOR SELECT 
  USING (id = auth.uid());

-- 3. Replace all inline subqueries with the helper function to prevent recursion and improve performance

-- Tenants
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.current_user_tenant_id());

-- Users
DROP POLICY IF EXISTS "Users can view own tenant users" ON public.users;
CREATE POLICY "Users can view own tenant users"
  ON public.users FOR SELECT
  USING (tenant_id = public.current_user_tenant_id());

-- Grant Opportunities
DROP POLICY IF EXISTS "Tenant isolation for grants" ON public.grant_opportunities;
CREATE POLICY "Tenant isolation for grants"
  ON public.grant_opportunities FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Grant Matches
DROP POLICY IF EXISTS "Tenant isolation for matches" ON public.grant_matches;
CREATE POLICY "Tenant isolation for matches"
  ON public.grant_matches FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Agent Runs
DROP POLICY IF EXISTS "Tenant isolation for agent runs" ON public.agent_runs;
CREATE POLICY "Tenant isolation for agent runs"
  ON public.agent_runs FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Org Profiles
DROP POLICY IF EXISTS "Tenant isolation for org profiles" ON public.org_profiles;
CREATE POLICY "Tenant isolation for org profiles"
  ON public.org_profiles FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Vault Documents
DROP POLICY IF EXISTS "Tenant isolation for vault documents" ON public.vault_documents;
CREATE POLICY "Tenant isolation for vault documents"
  ON public.vault_documents FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Vault Chunks
DROP POLICY IF EXISTS "Tenant isolation for vault chunks" ON public.vault_chunks;
CREATE POLICY "Tenant isolation for vault chunks"
  ON public.vault_chunks FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Grant Applications
DROP POLICY IF EXISTS "Tenant isolation for applications" ON public.grant_applications;
CREATE POLICY "Tenant isolation for applications"
  ON public.grant_applications FOR ALL
  USING (tenant_id = public.current_user_tenant_id())
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- CRM Sync Logs
DROP POLICY IF EXISTS "Tenant isolation for crm logs" ON public.crm_sync_logs;
CREATE POLICY "Tenant isolation for crm logs"
  ON public.crm_sync_logs FOR ALL
  USING (tenant_id = public.current_user_tenant_id());
-- Migration: 00020_storage_rls_vault
-- Adds RLS policies for Supabase Storage bucket vault-documents.

-- 1. Ensure the bucket exists (in case it wasn't created via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;


-- 3. Policy: Allow users to upload (INSERT) files to their own tenant folder
DROP POLICY IF EXISTS "Tenant isolation for vault uploads" ON storage.objects;
CREATE POLICY "Tenant isolation for vault uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault-documents' AND
    -- Path format is {tenant_id}/vault/{uuid}/{filename}
    -- split_part(name, '/', 1) extracts the tenant_id folder
    split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

-- 4. Policy: Allow users to read/download (SELECT) files in their own tenant folder
DROP POLICY IF EXISTS "Tenant isolation for vault reads" ON storage.objects;
CREATE POLICY "Tenant isolation for vault reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-documents' AND
    split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

-- Note: No UPDATE or DELETE policies are provided yet, 
-- as Vault documents are currently append-only/soft-deleted in DB.
-- Migration: 00021_fix_hybrid_search_types
-- Fixes type mismatch in hybrid_search_vault where ts_rank_cd returned REAL (float4)
-- but the RETURNS TABLE expected FLOAT (double precision / float8).

CREATE OR REPLACE FUNCTION hybrid_search_vault(
  query_text        TEXT,       -- Raw text query (used for FTS)
  query_embedding   VECTOR(1536), -- Embedded query vector (used for cosine sim)
  p_tenant_id       UUID,
  match_count       INT DEFAULT 5,
  -- Weights: 0.0 = pure FTS, 1.0 = pure vector. Default: balanced.
  vector_weight     FLOAT DEFAULT 0.6,
  fts_weight        FLOAT DEFAULT 0.4,
  similarity_floor  FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id      UUID,
  document_id   UUID,
  document_title TEXT,
  content       TEXT,
  vector_score  FLOAT,
  fts_score     FLOAT,
  hybrid_score  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      vc.id                                            AS chunk_id,
      vc.document_id,
      vc.content,
      1 - (vc.embedding <=> query_embedding)           AS v_score
    FROM vault_chunks vc
    WHERE vc.tenant_id = p_tenant_id
      AND vc.deleted_at IS NULL
      AND vc.embedding IS NOT NULL
      AND 1 - (vc.embedding <=> query_embedding) > similarity_floor
  ),
  fts_results AS (
    SELECT
      vc.id                                            AS chunk_id,
      vc.document_id,
      vc.content,
      ts_rank_cd(vc.fts_content, query)                AS f_score
    FROM vault_chunks vc,
         websearch_to_tsquery('english', query_text) query
    WHERE vc.tenant_id = p_tenant_id
      AND vc.deleted_at IS NULL
      AND vc.fts_content @@ query
  ),
  combined AS (
    SELECT
      COALESCE(vr.chunk_id, fr.chunk_id)       AS chunk_id,
      COALESCE(vr.document_id, fr.document_id) AS document_id,
      COALESCE(vr.content, fr.content)         AS content,
      -- Explicitly cast all scores to FLOAT8 (double precision) to match RETURNS TABLE (FLOAT)
      COALESCE(vr.v_score, 0.0)::FLOAT8        AS vector_score,
      COALESCE(fr.f_score, 0.0)::FLOAT8        AS fts_score,
      ( (COALESCE(vr.v_score, 0.0)::FLOAT8 * vector_weight) +
        (COALESCE(fr.f_score, 0.0)::FLOAT8 * fts_weight) )::FLOAT8 AS hybrid_score
    FROM vector_results vr
    FULL OUTER JOIN fts_results fr ON vr.chunk_id = fr.chunk_id
  )
  SELECT
    c.chunk_id,
    c.document_id,
    vd.title                                   AS document_title,
    c.content,
    c.vector_score,
    c.fts_score,
    c.hybrid_score
  FROM combined c
  JOIN vault_documents vd ON vd.id = c.document_id
  WHERE vd.deleted_at IS NULL
  ORDER BY c.hybrid_score DESC
  LIMIT match_count;
END;
$$;
-- Migration: 00022_update_agent_runs_enum
-- Update the agent_type CHECK constraint to match current agents

ALTER TABLE agent_runs DROP CONSTRAINT agent_runs_agent_type_check;

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_agent_type_check 
  CHECK (agent_type IN ('scout', 'librarian', 'architect', 'liaison'));
