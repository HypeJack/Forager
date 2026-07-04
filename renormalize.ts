import { createClient } from "@supabase/supabase-js";
import { htmlToPlainText } from "./packages/shared/src/utils/text.js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  const { data, error } = await supabase
    .from("grant_opportunities")
    .select("id, metadata")
    .eq("tenant_id", tenantId)
    .not("metadata->descriptionHtml", "is", null);

  if (error) { console.error(error); return; }

  let count = 0;
  for (const row of (data || [])) {
    if (row.metadata && typeof row.metadata === 'object' && 'descriptionHtml' in row.metadata) {
      const html = row.metadata.descriptionHtml;
      const plain = htmlToPlainText(html as string);
      const { error: updateError } = await supabase
        .from("grant_opportunities")
        .update({ description: plain })
        .eq("id", row.id);
      
      if (!updateError) {
        count++;
      } else {
        console.error(`Failed to update ${row.id}`, updateError);
      }
    }
  }
  console.log(`Updated ${count} rows.`);
}
run();
