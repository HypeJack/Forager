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
