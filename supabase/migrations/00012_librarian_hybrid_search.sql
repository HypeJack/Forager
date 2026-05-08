-- Migration: 00012_librarian_hybrid_search
-- Hybrid vector + FTS retrieval for the Librarian agent.
-- Every result carries document provenance: document_id + document title.

CREATE OR REPLACE FUNCTION hybrid_search_vault(
  query_text        TEXT,       -- Raw text query (used for FTS)
  query_embedding   VECTOR(1536), -- Embedded query vector (used for cosine sim)
  p_tenant_id       UUID,
  match_count       INT DEFAULT 5,
  -- Weights: 0.0 = pure FTS, 1.0 = pure vector. Default: balanced.
  vector_weight     FLOAT DEFAULT 0.6,
  fts_weight        FLOAT DEFAULT 0.4,
  similarity_floor  FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id      UUID,
  document_id   UUID,
  document_title TEXT,
  content       TEXT,
  vector_score  FLOAT,
  fts_score     FLOAT,
  hybrid_score  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      vc.id                                            AS chunk_id,
      vc.document_id,
      vc.content,
      1 - (vc.embedding <=> query_embedding)           AS v_score
    FROM vault_chunks vc
    WHERE vc.tenant_id = p_tenant_id
      AND vc.deleted_at IS NULL
      AND vc.embedding IS NOT NULL
      AND 1 - (vc.embedding <=> query_embedding) > similarity_floor
  ),
  fts_results AS (
    SELECT
      vc.id                                            AS chunk_id,
      vc.document_id,
      vc.content,
      ts_rank_cd(vc.fts_content, query)                AS f_score
    FROM vault_chunks vc,
         websearch_to_tsquery('english', query_text) query
    WHERE vc.tenant_id = p_tenant_id
      AND vc.deleted_at IS NULL
      AND vc.fts_content @@ query
  ),
  combined AS (
    SELECT
      COALESCE(vr.chunk_id, fr.chunk_id)     AS chunk_id,
      COALESCE(vr.document_id, fr.document_id) AS document_id,
      COALESCE(vr.content, fr.content)        AS content,
      COALESCE(vr.v_score, 0.0)               AS vector_score,
      COALESCE(fr.f_score, 0.0)               AS fts_score,
      (COALESCE(vr.v_score, 0.0) * vector_weight) +
      (COALESCE(fr.f_score, 0.0) * fts_weight) AS hybrid_score
    FROM vector_results vr
    FULL OUTER JOIN fts_results fr ON vr.chunk_id = fr.chunk_id
  )
  SELECT
    c.chunk_id,
    c.document_id,
    vd.title                                          AS document_title,
    c.content,
    c.vector_score,
    c.fts_score,
    c.hybrid_score
  FROM combined c
  JOIN vault_documents vd ON vd.id = c.document_id
  WHERE vd.deleted_at IS NULL
  ORDER BY c.hybrid_score DESC
  LIMIT match_count;
END;
$$;
