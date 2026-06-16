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
