import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  const { data: orgProfile } = await supabase.from("org_profiles").select("focus_areas").eq("tenant_id", tenantId).single();
  
  console.log("=== R1. Focus Areas ===");
  console.log(JSON.stringify(orgProfile?.focus_areas, null, 2));

  // V1 - Raw live API call (we will use 'robotics' if available, else 'health')
  const keyword = "robotics"; // Let's test with 'robotics'
  console.log("\n=== V1. Raw Live API Call ===");
  try {
    const response = await fetch("https://api.grants.gov/v1/api/search2", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: keyword,
        // let's try basic first
      })
    });
    
    if (!response.ok) {
       console.log("Status:", response.status);
       console.log(await response.text());
       return;
    }
    const data = await response.json();
    console.log("Response envelope keys:", Object.keys(data));
    
    // figure out where the array is
    let arrayKey = null;
    let items = null;
    if (Array.isArray(data.oppHits)) { arrayKey = 'oppHits'; items = data.oppHits; }
    else if (Array.isArray(data.items)) { arrayKey = 'items'; items = data.items; }
    else if (Array.isArray(data.opportunities)) { arrayKey = 'opportunities'; items = data.opportunities; }
    else if (data.data) {
       console.log("data envelope keys:", Object.keys(data.data));
       if (Array.isArray(data.data.oppHits)) { arrayKey = 'data.oppHits'; items = data.data.oppHits; }
       else if (Array.isArray(data.data.items)) { arrayKey = 'data.items'; items = data.data.items; }
       else if (Array.isArray(data.data.opportunities)) { arrayKey = 'data.opportunities'; items = data.data.opportunities; }
       else if (Array.isArray(data.data)) { arrayKey = 'data'; items = data.data; }
    }
    
    console.log("Found array at:", arrayKey, "- length:", items?.length);
    if (items && items.length > 0) {
      console.log("First hit keys:", Object.keys(items[0]));
      console.log("First hit sample data:");
      console.log(JSON.stringify(items[0], null, 2));
    }

  } catch (err) {
    console.error("API error:", err);
  }
}

run();
