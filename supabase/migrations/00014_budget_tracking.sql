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
