import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  console.log("=== 3. agent_runs lifecycle ===");
  const { data: runs, error: runsErr } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("agent_type", "scout")
    .order("created_at", { ascending: false })
    .limit(3);
    
  if (runsErr) console.error(runsErr);
  else console.log(JSON.stringify(runs, null, 2));

  console.log("\n=== 4. Real opportunities landed ===");
  const { data: opps, error: oppsErr } = await supabase
    .from("grant_opportunities")
    .select("id, title, funder, deadline, url, status")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(10);
    
  if (oppsErr) console.error(oppsErr);
  else {
    if (opps?.length === 0) {
       console.log("Zero opportunities returned.");
    } else {
       console.table(opps);
    }
  }
}

run();
