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
