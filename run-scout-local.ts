import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { searchGrantsGov } from "./packages/agents/src/scout/sources/grants-gov.js";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  console.log("Triggering Scout local run...");
  const orgProfile = { focus_areas: ["youth"] }; // mock profile
  
  // 1. Search Grants Gov
  const start = Date.now();
  console.log("Calling searchGrantsGov...");
  const opps = await searchGrantsGov(orgProfile.focus_areas);
  console.log(`searchGrantsGov returned ${opps.length} opportunities in ${Date.now() - start}ms`);
  
  // 2. Insert into DB
  let inserted = 0;
  for (const opp of opps) {
    const { error } = await supabase.from("grant_opportunities").insert({
      tenant_id: tenantId,
      ...opp
    });
    if (!error) inserted++;
  }
  console.log(`Inserted ${inserted} new opportunities.`);
}
run();
