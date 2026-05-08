-- Migration: 00004_create_agent_runs
-- Tracks all agentic workflow executions for observability and audit.

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
