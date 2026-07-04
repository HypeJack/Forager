import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const tId = "b57c55ff-7996-452b-931b-5aaadbb1a862";
  const { data: opps } = await supabase.from("grant_opportunities").select("id, title").eq("tenant_id", tId);
  const { data: apps } = await supabase.from("grant_applications").select("id, status").eq("tenant_id", tId);
  console.log("Opps:", opps);
  console.log("Apps:", apps);
}
run();
