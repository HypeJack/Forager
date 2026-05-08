-- Migration: 00009_similarity_search_rpc
-- RPC for Vault RAG using pgvector cosine similarity (<=>).

CREATE OR REPLACE FUNCTION match_vault_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.document_id,
    vc.content,
    1 - (vc.embedding <=> query_embedding) AS similarity
  FROM vault_chunks vc
  WHERE vc.tenant_id = p_tenant_id
    AND vc.deleted_at IS NULL
    AND 1 - (vc.embedding <=> query_embedding) > match_threshold
  ORDER BY vc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
