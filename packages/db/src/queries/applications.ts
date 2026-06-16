
import type { ForagerClient } from "../client.js";
import type { Json } from "../types.js";

export interface ApplicationOutlineSection {
  id: string;
  title: string;
  status: "pending" | "drafting" | "complete";
  content: string | null;
  wordCount?: number;
}

export interface GrantApplication {
  id: string;
  tenant_id: string;
  opportunity_id: string;
  outline: ApplicationOutlineSection[];
  match_prior_voice: boolean;
  current_section: string | null;
  status: "pre_draft" | "drafting" | "paused" | "complete" | "submitted";
  submitted_via: "portal" | "manual" | "final" | null;
  submitted_at: string | null;
  total_tokens_used: number;
  created_at: string;
  updated_at: string;
}

export async function createApplication(
  client: ForagerClient,
  payload: {
    tenant_id: string;
    opportunity_id: string;
    outline: ApplicationOutlineSection[];
    match_prior_voice: boolean;
  }
): Promise<GrantApplication> {
  const { data, error } = await client
    .from("grant_applications")
    .insert({
      ...payload,
      outline: payload.outline as unknown as Json,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create application: ${error.message}`);
  return { ...data, outline: data.outline as unknown as ApplicationOutlineSection[] } as GrantApplication;
}

export async function getApplication(
  client: ForagerClient,
  id: string
): Promise<GrantApplication | null> {
  const { data } = await client
    .from("grant_applications")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  return data as GrantApplication | null;
}

export async function updateSectionContent(
  client: ForagerClient,
  applicationId: string,
  sectionId: string,
  content: string,
  tokensUsed: number
): Promise<void> {
  // Fetch current outline
  const { data, error: fetchErr } = await client
    .from("grant_applications")
    .select("outline, total_tokens_used")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !data) throw new Error("Failed to fetch application for update");

  const outline = (data.outline as unknown as ApplicationOutlineSection[]).map((s) =>
    s.id === sectionId ? { ...s, status: "complete" as const, content } : s
  );

  await client
    .from("grant_applications")
    .update({
      outline: outline as unknown as Json,
      current_section: null,
      total_tokens_used: (data.total_tokens_used ?? 0) + tokensUsed,
    })
    .eq("id", applicationId);
}

export async function updateApplicationStatus(
  client: ForagerClient,
  applicationId: string,
  status: GrantApplication["status"],
  extras?: Partial<Pick<GrantApplication, "submitted_via" | "submitted_at">>
): Promise<void> {
  await client
    .from("grant_applications")
    .update({ status, ...extras })
    .eq("id", applicationId);
}
