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
