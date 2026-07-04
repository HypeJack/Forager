import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  const { data, error } = await supabase
    .from("grant_opportunities")
    .select("id, title, funder, status, description, metadata, deadline")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(25);
    
  if (error) {
    console.error(error); return;
  }
  
  // Format exactly like SQL output
  console.log(" id | title | funder | status | desc_preview | opp_status | deadline ");
  console.log("----+-------+--------+--------+--------------+------------+----------");
  
  let hollowCount = 0;
  for (const row of data) {
    if (row.description === "Description not provided.") hollowCount++;
    const desc = row.description ? row.description.substring(0, 120).replace(/\n/g, " ") : "";
    const oppStatus = row.metadata?.oppStatus || "null";
    console.log(`${row.id.split('-')[0]}... | ${row.title.substring(0, 30)}... | ${row.funder} | ${row.status} | ${desc} | ${oppStatus} | ${row.deadline}`);
  }
  console.log("\n(25 rows)\n");
  console.log("Hollow records count (description = 'Description not provided.'):", hollowCount);
}
run();
