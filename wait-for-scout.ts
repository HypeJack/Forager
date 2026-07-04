import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

const startTime = process.argv[2];

async function wait() {
  console.log(`Waiting for scout agent to finish (runs after ${startTime})...`);
  let completed = false;
  while (!completed) {
    const { data } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('agent_type', 'scout')
      .gte('created_at', startTime)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (data && data.length > 0 && data[0].status === 'completed') {
      console.log("=== INNGEST RUN LOG (LATEST) ===");
      console.log(JSON.stringify(data[0], null, 2));
      completed = true;
    } else {
      process.stdout.write(".");
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}
wait().then(() => {
  console.log("\nDone waiting.");
});
