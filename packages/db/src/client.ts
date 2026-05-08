import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export type ForagerClient = ReturnType<typeof createClient>;

/**
 * Create a typed Supabase client.
 * Use in server contexts (packages/agents, API routes).
 */
export function createClient(
  url?: string,
  serviceRoleKey?: string
) {
  const supabaseUrl = url ?? process.env.SUPABASE_URL;
  const supabaseKey = serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return supabaseCreateClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
