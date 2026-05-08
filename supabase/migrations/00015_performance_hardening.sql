-- Migration: 00015_performance_hardening
-- Implements HNSW indexing for pgvector to optimize Librarian retrieval latency.

-- 1. HNSW Index for Vector Search
-- Uses 1536 dimensions (OpenAI) with cosine similarity
CREATE INDEX IF NOT EXISTS idx_vault_chunks_embedding_hnsw 
ON vault_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 2. Index for tenant-scoped lookups on frequently queried agent logs
CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant_created 
ON agent_runs (tenant_id, created_at DESC);

-- 3. GIN index for outline JSONB search
CREATE INDEX IF NOT EXISTS idx_grant_applications_outline_gin 
ON grant_applications USING GIN (outline);
