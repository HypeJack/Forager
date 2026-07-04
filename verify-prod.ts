import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

  console.log("=== V4: Recent Grant Opportunities ===");
  const { data: opps, error: oppsErr } = await supabase
    .from("grant_opportunities")
    .select("id, title, funder, status, deadline, amount_min, amount_max, description")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (oppsErr) {
    console.error("Error fetching opps:", oppsErr);
  } else {
    let forecastCount = 0;
    let forecastWithRealText = 0;
    let forecastWithPlaceholder = 0;
    
    let synopsisCount = 0;
    let synopsisWithRealText = 0;

    for (const opp of opps) {
      // We can infer if it's a forecast if there are no amount boundaries but it was inserted.
      // Or we can just print them all.
      // Let's truncate description for display.
      const descPreview = opp.description ? opp.description.substring(0, 120) : "";
      const isPlaceholder = descPreview.includes("Description not provided");
      
      // Let's print the record
      console.log(`\nID: ${opp.id} | Title: ${opp.title} | Amounts: ${opp.amount_min} - ${opp.amount_max} | Deadline: ${opp.deadline}`);
      console.log(`Desc: ${descPreview.replace(/\n/g, " ")}...`);
      
      // Rough heuristic for forecast vs posted based on amounts since forecasts usually lack them
      // but let's just let the user see the raw rows.
    }
    console.log(`\nTotal Opps Fetched: ${opps?.length}`);
  }

  console.log("\n=== V5: Agent Runs ===");
  const { data: runs, error: runsErr } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("agent_type", "scout")
    .order("created_at", { ascending: false })
    .limit(5);

  if (runsErr) {
    console.error("Error fetching agent_runs:", runsErr);
  } else {
    console.log(JSON.stringify(runs, null, 2));
  }
}

run();
