-- Migration: 00022_update_agent_runs_enum
-- Update the agent_type CHECK constraint to match current agents

ALTER TABLE agent_runs DROP CONSTRAINT agent_runs_agent_type_check;

ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_agent_type_check 
  CHECK (agent_type IN ('scout', 'librarian', 'architect', 'liaison'));
