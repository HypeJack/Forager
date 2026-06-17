-- Run this snippet in the Supabase SQL editor to allowlist your email
-- Replace with your actual email address
INSERT INTO allowlisted_emails (email)
VALUES ('your-email@example.com')
ON CONFLICT (email) DO NOTHING;
