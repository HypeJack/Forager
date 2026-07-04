import { searchGrantsGov } from "./packages/agents/src/scout/sources/grants-gov.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function run() {
  const { data: orgProfile } = await supabase.from("org_profiles").select("*").eq("tenant_id", tenantId).single();
  console.log("Focus areas:", orgProfile?.focus_areas);
  console.log("Fetching...");
  const opps = await searchGrantsGov(orgProfile?.focus_areas || ["education"]);
  console.log("Found:", opps.length);
  if (opps.length > 0) {
    const opp = opps[0];
    const { data, error } = await supabase.from("grant_opportunities").insert({
      tenant_id: tenantId,
      title: opp.title,
      funder: opp.funder,
      description: opp.description,
      amount_min: opp.amount_min,
      amount_max: opp.amount_max,
      deadline: opp.deadline,
      url: opp.url,
      status: opp.status || "matched",
      tags: opp.tags || [],
      metadata: opp.metadata || {}
    }).select("id").single();
    
    if (error) {
      console.error("Insert error:", error);
    } else {
      console.log("Insert success:", data);
    }
  }
}
run();
