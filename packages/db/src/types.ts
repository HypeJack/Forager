/**
 * Database type definitions.
 * TODO: Auto-generate from `supabase gen types typescript` after migrations are applied.
 */
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          full_name: string;
          role: string;
          avatar_url: string | null;
          last_sign_in: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      grant_opportunities: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          funder: string;
          description: string;
          amount_min: number | null;
          amount_max: number | null;
          deadline: string | null;
          url: string;
          status: string;
          tags: string[];
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["grant_opportunities"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["grant_opportunities"]["Insert"]>;
      };
      grant_matches: {
        Row: {
          id: string;
          tenant_id: string;
          opportunity_id: string;
          score: number;
          rationale: string;
          evidence: Record<string, unknown>[];
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["grant_matches"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["grant_matches"]["Insert"]>;
      };
      agent_runs: {
        Row: {
          id: string;
          tenant_id: string;
          agent_type: string;
          status: string;
          input: Record<string, unknown>;
          output: Record<string, unknown> | null;
          error: string | null;
          model: string;
          tokens_used: number;
          duration_ms: number | null;
          triggered_by: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_runs"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
