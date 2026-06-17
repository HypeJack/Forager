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

