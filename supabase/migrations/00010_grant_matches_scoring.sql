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
