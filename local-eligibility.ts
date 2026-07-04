import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { searchGrantsGov } from "./packages/agents/src/scout/sources/grants-gov.ts";
import { callLLM } from "./packages/orchestration/src/llm-client.ts";

dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const tenantId = 'b57c55ff-7996-452b-931b-5aaadbb1a862';

async function run() {
  const { data: orgProfile } = await supabase.from("org_profiles").select("*").eq("tenant_id", tenantId).single();
  
  console.log("Discovering opportunities...");
  const opps = await searchGrantsGov(orgProfile.focus_areas);
  console.log(`Discovered ${opps.length} opportunities from Grants.gov`);

  let passed = 0;
  let rejected = 0;

  console.log("\n=== Verdict Breakdown (First 10 items) ===");
  const sample = opps.slice(0, 10);
  for (const opp of sample) {
    const eligibilitySystem = `You are a grant eligibility analyst for a ${orgProfile.org_type}.
Determine if this organization is strictly eligible for this grant. Return JSON: { "eligible": boolean, "rationale": "string" }`;
    const eligibilityPrompt = `Org Profile:\n${JSON.stringify(orgProfile, null, 2)}\n\nOpportunity:\n${JSON.stringify(opp, null, 2)}`;
    
    try {
      const res = await callLLM({
        task: "scout_eligibility_analysis",
        system: eligibilitySystem,
        prompt: eligibilityPrompt
      });
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.eligible) passed++; else rejected++;
        console.log(`- [${parsed.eligible ? 'PASS' : 'FAIL'}] ${opp.title.substring(0, 50)}...`);
        console.log(`  Reason: ${parsed.rationale}`);
      }
    } catch (e) {
      console.log(`- [ERROR] ${opp.title}`);
    }
  }

  console.log(`\nSample Total: ${sample.length} | Passed: ${passed} | Rejected: ${rejected}`);
}
run();
