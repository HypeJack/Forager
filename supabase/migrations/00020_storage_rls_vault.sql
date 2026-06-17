-- Migration: 00020_storage_rls_vault
-- Adds RLS policies for Supabase Storage bucket vault-documents.

-- 1. Ensure the bucket exists (in case it wasn't created via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-documents', 'vault-documents', false)
ON CONFLICT (id) DO NOTHING;


-- 3. Policy: Allow users to upload (INSERT) files to their own tenant folder
DROP POLICY IF EXISTS "Tenant isolation for vault uploads" ON storage.objects;
CREATE POLICY "Tenant isolation for vault uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault-documents' AND
    -- Path format is {tenant_id}/vault/{uuid}/{filename}
    -- split_part(name, '/', 1) extracts the tenant_id folder
    split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

-- 4. Policy: Allow users to read/download (SELECT) files in their own tenant folder
DROP POLICY IF EXISTS "Tenant isolation for vault reads" ON storage.objects;
CREATE POLICY "Tenant isolation for vault reads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault-documents' AND
    split_part(name, '/', 1) = public.current_user_tenant_id()::text
  );

-- Note: No UPDATE or DELETE policies are provided yet, 
-- as Vault documents are currently append-only/soft-deleted in DB.
