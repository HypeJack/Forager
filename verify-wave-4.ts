import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  console.log("=== 1. Firing Event via Edge Function ===");
  // Lookup user
  const { data: users } = await supabase.from("users").select("id").eq("tenant_id", tenantId).limit(1);
  const userId = users?.[0]?.id || 'system';

  try {
    const { data, error } = await supabase.functions.invoke("emit-inngest-event", {
      body: {
        name: "scout/run.requested",
        data: { tenantId, triggeredBy: userId }
      }
    });
    
    if (error) {
      console.log("Supabase error object:", error);
      const errContext = await error.context?.json?.().catch(() => null) || await error.context?.text?.().catch(() => null);
      console.log("Error context:", errContext);
    } else {
      console.log("Edge Function Response:", data);
    }
  } catch (err) {
    console.error("Caught error:", err);
  }
}

run();
