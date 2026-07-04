import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function run() {
  const { data, count } = await supabase
    .from("grant_opportunities")
    .select("title", { count: "exact" })
    .eq("tenant_id", tenantId);
  console.log("Total opps for tenant:", count);
}
run();
