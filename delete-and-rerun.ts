import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function run() {
  // Delete opps created today to allow scout to re-fetch them
  const { error } = await supabase
    .from("grant_opportunities")
    .delete()
    .eq("tenant_id", tenantId)
    .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  if (error) {
    console.error("Delete failed:", error);
    return;
  }
  console.log("Deleted recent opps.");
  
  // Trigger scout
  const { data: users } = await supabase.from("users").select("id").eq("tenant_id", tenantId).limit(1);
  const userId = users?.[0]?.id || "system";
  
  console.log("Triggering scout...");
  const { data: res, error: err } = await supabase.functions.invoke("emit-inngest-event", {
    body: { name: "scout/run.requested", data: { tenantId, triggeredBy: userId } }
  });
  
  if (err || (res && res.error)) {
    console.error("Trigger failed:", err || res?.error);
  } else {
    console.log("Scout queued!");
  }
}
run();
