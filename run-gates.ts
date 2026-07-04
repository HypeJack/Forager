import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

const startTime = process.argv[2];

async function run() {
  console.log(`Using start time: ${startTime}`);
  
  console.log("\n=== GATE 1: Merge Intact ===");
  const { data: q1 } = await supabase
    .from("grant_opportunities")
    .select("title, description, metadata, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", startTime)
    .order("created_at", { ascending: false });
  
  console.table((q1||[]).map(r => ({
    title: r.title.substring(0,30),
    has_html: !!r.metadata?.descriptionHtml,
    opp_status: r.metadata?.oppStatus,
    doc_type: r.metadata?.docType,
    still_has_tags: /<[a-zA-Z/]/.test(r.description || '')
  })));

  console.log("\n=== GATE 2: Forecast Certification ===");
  const { data: q2 } = await supabase
    .from("grant_opportunities")
    .select("title, description, metadata, created_at, id")
    .eq("tenant_id", tenantId)
    .gte("created_at", startTime);
  
  const filtered = (q2||[]).filter(r => r.metadata?.oppStatus === 'forecasted');
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  console.table(filtered.map(r => ({
    title: r.title.substring(0,40),
    opp_status: r.metadata?.oppStatus,
    doc_type: r.metadata?.docType,
    desc_preview: r.description ? r.description.substring(0,90).replace(/\n/g, " ") : "",
    is_hollow: r.description === 'Description not provided.'
  })));

  console.log("\n=== Congress-Bundestag Opp ID for Screenshot ===");
  const { data: qAll } = await supabase.from("grant_opportunities").select("id, description").eq("tenant_id", tenantId);
  const cbyx = (qAll||[]).find(r => r.description && r.description.includes("CBYX"));
  if (cbyx) {
    console.log(`https://projectforager-myev7v9pe-soul-sync-now.vercel.app/opportunities/${cbyx.id}`);
  }
}
run();
