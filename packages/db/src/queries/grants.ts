import type { ForagerClient } from "../client.js";
import type { GrantOpportunity, GrantStatus } from "@forager/shared";

/**
 * Fetch grant opportunities for a tenant with optional status filter.
 */
export async function getGrantsByTenant(
  client: ForagerClient,
  tenantId: string,
  options?: { status?: GrantStatus; limit?: number; offset?: number }
) {
  let query = client
    .from("grant_opportunities")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 25) - 1);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch grants: ${error.message}`);
  return data as unknown as GrantOpportunity[];
}

/**
 * Insert a new grant opportunity.
 */
export async function createGrant(
  client: ForagerClient,
  grant: Omit<GrantOpportunity, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await client
    .from("grant_opportunities")
    .insert(grant)
    .select()
    .single();

  if (error) throw new Error(`Failed to create grant: ${error.message}`);
  return data as unknown as GrantOpportunity;
}

/**
 * Update a grant opportunity's status.
 */
export async function updateGrantStatus(
  client: ForagerClient,
  grantId: string,
  tenantId: string,
  status: GrantStatus
) {
  const { data, error } = await client
    .from("grant_opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", grantId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update grant status: ${error.message}`);
  return data as unknown as GrantOpportunity;
}
