import type { ForagerClient } from "../client.js";

export interface LibrarianResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  vectorScore: number;
  ftsScore: number;
  hybridScore: number;
}

/**
 * Hybrid Librarian search — combines pgvector cosine similarity with
 * Postgres Full-Text Search. Every result carries strict document provenance.
 */
export async function hybridSearchVault(
  client: ForagerClient,
  queryText: string,
  queryEmbedding: number[],
  tenantId: string,
  options: {
    matchCount?: number;
    vectorWeight?: number;
    ftsWeight?: number;
    similarityFloor?: number;
  } = {}
): Promise<LibrarianResult[]> {
  const { data, error } = await client.rpc("hybrid_search_vault", {
    query_text: queryText,
    query_embedding: queryEmbedding,
    p_tenant_id: tenantId,
    match_count: options.matchCount ?? 5,
    vector_weight: options.vectorWeight ?? 0.6,
    fts_weight: options.ftsWeight ?? 0.4,
    similarity_floor: options.similarityFloor ?? 0.3,
  });

  if (error) throw new Error(`Librarian hybrid search failed: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    content: row.content,
    vectorScore: row.vector_score,
    ftsScore: row.fts_score,
    hybridScore: row.hybrid_score,
  }));
}
