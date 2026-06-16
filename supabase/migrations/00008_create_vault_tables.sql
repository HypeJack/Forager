-- Migration: 00008_create_vault_tables
-- Vault documents and chunks with pgvector embeddings.
-- Both tables enforce soft deletes via deleted_at.

-- ── vault_documents ────────────────────────────────────────────

CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN ('processing', 'indexed', 'failed')
  ),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete: NULL = active, non-NULL = deleted
);

CREATE INDEX idx_vault_docs_tenant ON vault_documents (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vault_docs_status ON vault_documents (tenant_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER set_vault_documents_updated_at
  BEFORE UPDATE ON vault_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ── vault_chunks ───────────────────────────────────────────────

CREATE TABLE vault_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small dimensions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete: NULL = active, non-NULL = deleted
);

CREATE INDEX idx_vault_chunks_document ON vault_chunks (document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vault_chunks_tenant ON vault_chunks (tenant_id) WHERE deleted_at IS NULL;

-- Similarity search index (IVFFlat) — created only after data exists
-- CREATE INDEX idx_vault_chunks_embedding ON vault_chunks
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);

-- ── RLS ────────────────────────────────────────────────────────

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for vault documents"
  ON vault_documents FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for vault chunks"
  ON vault_chunks FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
