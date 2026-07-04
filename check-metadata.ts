import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function run() {
  const { data: q1 } = await supabase
    .from("grant_opportunities")
    .select("title, metadata, created_at")
    .eq("tenant_id", tenantId)
    .not('metadata->oppStatus', 'is', null)
    .limit(10);
  
  console.log("Rows with oppStatus:");
  console.table((q1||[]).map(r => ({
    title: r.title.substring(0,30),
    has_html: !!r.metadata?.descriptionHtml,
    opp_status: r.metadata?.oppStatus,
    doc_type: r.metadata?.docType
  })));
}
run();
