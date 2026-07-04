import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  const { data: orgProfile } = await supabase.from("org_profiles").select("focus_areas").eq("tenant_id", tenantId).single();
  const keyword = orgProfile?.focus_areas?.join(" ") || "";
  
  console.log("=== Raw Grants.gov API Response for keywords:", keyword, "===");
  try {
    const response = await fetch("https://www.grants.gov/grantsws/rest/opportunities/search", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: keyword,
        oppStatuses: "forecasted|posted",
        rows: 5,
        startRecordNum: 0,
        sortBy: "openDate|desc"
      })
    });
    const text = await response.text();
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error("API error:", err);
  }
}

run();
