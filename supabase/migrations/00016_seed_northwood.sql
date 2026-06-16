-- Migration: 00016_seed_northwood
-- Adds the secondary demo tenant "Northwood Architects + Planners" to prove white-labeling functionality.

INSERT INTO tenants (id, name, slug, plan, settings)
VALUES (
  'b0e2b9c0-9a4f-4d1e-8e6b-7d1c6e5a4b3c', 
  'Northwood Architects + Planners', 
  'northwood',
  'industry',
  '{
    "theme": {
      "--color-brand-primary": "#2C3E50",
      "--color-brand-primary-light": "#34495E",
      "--color-brand-primary-dark": "#1A252F",
      "--color-brand-accent": "#E67E22",
      "--font-family-serif": "Georgia, serif"
    },
    "grant_categories": ["Urban Development", "Architecture", "Sustainability"]
  }'
) ON CONFLICT (id) DO NOTHING;

-- Seed a user for Northwood demo
-- (In a real system, auth.users is managed by Supabase, so this is just for DB structure demo)
INSERT INTO users (id, tenant_id, role, email, full_name)
VALUES (
  'd0f2e8b4-5a6b-4c1d-8e7f-9f8e7d6c5b4a',
  'b0e2b9c0-9a4f-4d1e-8e6b-7d1c6e5a4b3c',
  'admin',
  'admin@northwood.org',
  'Northwood Admin'
) ON CONFLICT (id) DO NOTHING;
