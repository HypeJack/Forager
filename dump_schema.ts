import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data, error } = await supabase.rpc("dump_schema"); // doesn't exist
  // We can just query pg_class, etc... but supabase rpc doesn't support raw SQL by default
}
