import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

  // 1. Create Opportunity
  const { data: opp } = await supabase.from("grant_opportunities").insert({
    tenant_id: tenantId,
    title: "2026 Youth Regional Program Grant",
    funder: "ARF Foundation",
    description: "Dummy grant for testing Architect.",
    is_saved: true
  }).select("id").single();

  // 2. Create Application with a draftable section
  const { data: app, error } = await supabase.from("grant_applications").insert({
    tenant_id: tenantId,
    opportunity_id: opp!.id,
    status: "pre_draft",
    outline: [
      { id: "sec-1", title: "Project Narrative: Youth Participation", status: "pending", content: null }
    ]
  }).select("id").single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`✅ Seeded Application! Go to: https://projectforager.vercel.app/drafts/${app!.id}`);
}

run();