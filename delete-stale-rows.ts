import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function main() {
  const { data, error, count } = await supabase
    .from("grant_opportunities")
    .delete({ count: 'exact' })
    .eq("tenant_id", tenantId)
    .is("relevance_score", null)
    .is("scored_at", null);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Deleted ${count} rows`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
