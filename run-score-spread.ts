import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function main() {
  const { data } = await supabase
    .from("grant_opportunities")
    .select("title, relevance_score, relevance_rationale")
    .eq("tenant_id", tenantId)
    .gte("created_at", "2026-07-03T22:23:28.757Z")
    .order("relevance_score", { ascending: false });

  console.table((data || []).map(r => ({
    title: r.title.substring(0,40),
    score: r.relevance_score,
    rationale: r.relevance_rationale ? r.relevance_rationale.substring(0,160) : ""
  })));
}

main().catch(console.error).finally(() => process.exit(0));
