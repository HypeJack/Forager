import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { htmlToPlainText } from "./packages/shared/src/utils/text.js";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

async function run() {
  console.log("Starting backfill for tenant", tenantId);
  
  // Fetch all opportunities for this tenant
  const { data, error } = await supabase
    .from("grant_opportunities")
    .select("id, description, metadata")
    .eq("tenant_id", tenantId);
    
  if (error) {
    console.error("Failed to fetch opportunities:", error);
    return;
  }
  
  console.log(`Found ${data.length} opportunities. Processing...`);
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const row of data) {
    // Idempotency Guard
    if (row.metadata && row.metadata.descriptionHtml) {
      skippedCount++;
      continue;
    }
    
    const existingMetadata = row.metadata || {};
    const originalHtml = row.description;
    
    // If description is null/undefined or already plain text? 
    // htmlToPlainText will just pass it through.
    const newDescription = htmlToPlainText(originalHtml);
    
    const newMetadata = {
      ...existingMetadata,
      descriptionHtml: originalHtml
    };
    
    const { error: updateError } = await supabase
      .from("grant_opportunities")
      .update({
        description: newDescription,
        metadata: newMetadata
      })
      .eq("id", row.id);
      
    if (updateError) {
      console.error(`Failed to update row ${row.id}:`, updateError);
    } else {
      updatedCount++;
    }
  }
  
  console.log(`Backfill complete. Updated ${updatedCount} rows. Skipped ${skippedCount} rows.`);
}
run();
