import type { ForagerClient } from "../client.js";

export interface VaultChunkMatch {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
}

/**
 * Perform a similarity search over the vault chunks using pgvector.
 * Calls the `match_vault_chunks` Postgres RPC.
 */
export async function matchVaultChunks(
  client: ForagerClient,
  queryEmbedding: number[],
  tenantId: string,
  options: { threshold?: number; count?: number } = {}
): Promise<VaultChunkMatch[]> {
  const { data, error } = await client.rpc("match_vault_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: options.threshold ?? 0.7,
    match_count: options.count ?? 5,
    p_tenant_id: tenantId,
  });

  if (error) {
    throw new Error(`Similarity search failed: ${error.message}`);
  }

  return data as VaultChunkMatch[];
}
