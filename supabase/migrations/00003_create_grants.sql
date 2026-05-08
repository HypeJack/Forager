-- Migration: 00003_create_grants
-- Grant opportunities and match results tables.

CREATE TABLE grant_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
