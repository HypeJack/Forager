import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import { searchGrantsGov, browseLillyEndowment } from "@forager/agents";
import { callLLM } from "@forager/orchestration";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runScoutAgent = inngest.createFunction(
  {
    id: "run-scout-agent",
    retries: 0, // Avoid repeating LLM calls during dev
  },
  { event: "scout/run.requested" },
  async ({ event, step }) => {
    const { tenantId, triggeredBy } = event.data;
    
    // Create an agent run record
    const runId = await step.run("init-run", async () => {
      const { data, error } = await supabase
        .from("agent_runs")
        .insert({
          tenant_id: tenantId,
          agent_type: "scout",
          status: "running",
          triggered_by: triggeredBy,
          model: "mixed", // multiple models used
          tokens_used: 0,
          input: {}
        })
        .select("id")
        .single();
        
      if (error) throw new Error(`Failed to create run: ${error.message}`);
      return data.id;
    });

    try {
      // 1. Load Org Profile
      const orgProfile = await step.run("load-org-profile", async () => {
        const { data, error } = await supabase
          .from("org_profiles")
          .select("*")
          .eq("tenant_id", tenantId)
          .single();

        if (error || !data) throw new Error("Org profile not found");
        return data;
      });

      // 2. Discover Opportunities (Grants.gov + Lilly Endowment)
      const rawOpportunities = await step.run("discover-opportunities", async () => {
        const [grantsGov, lilly] = await Promise.all([
          searchGrantsGov(orgProfile.focus_areas),
          browseLillyEndowment()
        ]);
        return [...grantsGov, ...lilly];
      });

      // 3. Process Opportunities (Eligibility -> Match Scoring)
      // We process sequentially here to manage state, but could use step.sendEvent for fan-out
      let processedCount = 0;
      
      for (const opp of rawOpportunities) {
        await step.run(`process-opp-${processedCount++}`, async () => {
          // A. Eligibility Analysis (claude-sonnet-4-6)
          const eligibilitySystem = `You are a grant eligibility analyst for a ${orgProfile.org_type}.
Determine if this organization is strictly eligible for this grant. Return JSON: { "eligible": boolean, "rationale": "string" }`;
          
          const eligibilityPrompt = `Org Profile:\n${JSON.stringify(orgProfile, null, 2)}\n\nOpportunity:\n${JSON.stringify(opp, null, 2)}`;
          
          const eligibilityRes = await callLLM({
            task: "scout_eligibility_analysis",
            system: eligibilitySystem,
            prompt: eligibilityPrompt
          });

          // Parse JSON safely
          let isEligible = false;
          let eligibilityRationale = "";
          try {
             // Basic JSON extraction
             const jsonMatch = eligibilityRes.text.match(/\{[\s\S]*\}/);
             if (jsonMatch) {
               const parsed = JSON.parse(jsonMatch[0]);
               isEligible = !!parsed.eligible;
               eligibilityRationale = parsed.rationale || "No rationale provided.";
             }
          } catch (e) {
             console.error("Failed to parse eligibility JSON", e);
          }

          if (!isEligible) return; // Skip if not eligible

          // B. Embed Opportunity Description to find relevant Vault Context
          // (Mocking this step due to no direct OpenAI import here, but production uses embeddings)
          // For MVP, we will just fetch the top 5 chunks indiscriminately or assume it's pre-loaded
          const { data: vaultChunks } = await supabase
            .from("vault_chunks")
            .select("content, document_id")
            .eq("tenant_id", tenantId)
            .limit(3);

          const vaultContext = vaultChunks ? vaultChunks.map(c => c.content).join("\n\n") : "No vault context available.";

          // C. Match Scoring (claude-sonnet-4-6)
          const matchSystem = `You are an expert grant strategist. Score the match between the organization's capabilities (from the Vault Context) and the grant opportunity.
Return JSON: { "score": number (0-100), "rationale": "string", "evidence": [{ "source": "string", "excerpt": "string", "relevance": "string" }] }`;
          
          const matchPrompt = `Org Profile:\n${JSON.stringify(orgProfile, null, 2)}\n\nVault Context:\n${vaultContext}\n\nOpportunity:\n${JSON.stringify(opp, null, 2)}`;
          
          const matchRes = await callLLM({
            task: "scout_match_scoring",
            system: matchSystem,
            prompt: matchPrompt
          });

          let score = 50;
          let rationale = "";
          let evidence: any[] = [];
          
          try {
            const jsonMatch = matchRes.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              score = parsed.score || 50;
              rationale = parsed.rationale || "No rationale provided.";
              evidence = parsed.evidence || [];
            }
          } catch (e) {
            console.error("Failed to parse match JSON", e);
          }

          // D. Persist to DB
          const { data: oppRecord, error: oppErr } = await supabase
            .from("grant_opportunities")
            .insert({
              tenant_id: tenantId,
              title: opp.title,
              funder: opp.funder,
              description: opp.description,
              amount_min: opp.amount_min,
              amount_max: opp.amount_max,
              deadline: opp.deadline,
              url: opp.url,
              status: opp.status || "matched",
              tags: opp.tags || [],
              metadata: opp.metadata || {}
            })
            .select("id")
            .single();

          if (oppErr || !oppRecord) {
             console.error("Failed to insert opp", oppErr);
             return;
          }

          await supabase
            .from("grant_matches")
            .insert({
              tenant_id: tenantId,
              opportunity_id: oppRecord.id,
              score,
              rationale,
              evidence,
              status: "pending",
              eligibility_rationale: eligibilityRationale,
              scout_model: "claude-3-5-sonnet-20241022",
              vault_context_used: vaultChunks
            });
        });
      }

      // Mark run complete
      await step.run("complete-run", async () => {
        await supabase
          .from("agent_runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", runId);
      });

      return { success: true, processed: rawOpportunities.length };
      
    } catch (error: any) {
      // Mark run failed
      await step.run("fail-run", async () => {
        await supabase
          .from("agent_runs")
          .update({
            status: "failed",
            error: error.message,
            completed_at: new Date().toISOString()
          })
          .eq("id", runId);
      });
      throw error;
    }
  }
);
// cache bust 2
