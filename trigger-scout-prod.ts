import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';
  // Use a known user ID for the triggeredBy field if needed, or omit if the function handles it
  
  // First, get a user from this tenant
  const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1);
      
  const userId = users && users.length > 0 ? users[0].id : "system";

  console.log("Triggering scout for tenant", tenantId, "as user", userId);
  
  const { data, error } = await supabase.functions.invoke("emit-inngest-event", {
    body: {
      name: "scout/run.requested",
      data: {
        tenantId: tenantId,
        triggeredBy: userId
      }
    }
  });

  if (error || (data && data.error)) {
     console.error("Failed to start Scout run:", error?.message || data?.error);
  } else {
     console.log("Scout agent run queued! Output:", data);
  }
}
run();
