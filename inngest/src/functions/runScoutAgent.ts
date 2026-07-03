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
          // A. Relevance Scoring (claude-sonnet-4-6)
          const scoringSystem = `You are an expert grant strategist evaluating opportunities for a ${orgProfile.org_type}.
Score the relevance of this grant opportunity to this organization on a continuous scale of 0-100.
Do NOT use a binary approach (0 or 100). Provide a nuanced score based on the following weighted rubric:
- Mission/Focus Alignment (40%): Does the grant's purpose closely match the organization's mission and focus areas?
- Applicant Eligibility & Scale Fit (40%): Is the grant appropriate for a ${orgProfile.org_type} with a budget of roughly $${orgProfile.annual_budget || "unknown"}? (e.g., A $50M university research grant or DoD engineering grant should score very low for a small community nonprofit, even if the topic aligns).
- Funding/Geographic/Deadline Feasibility (20%): Is the funding amount appropriate? Are there geographic restrictions?

Return JSON in this exact format: { "score": number, "rationale": "string" }
The rationale MUST be 1-2 sentences maximum (under 240 chars) grounding the specific fit/misfit for THIS grant and THIS org. Do not use generic boilerplate.`;

          const scoringPrompt = `Org Profile:\n${JSON.stringify(orgProfile, null, 2)}\n\nOpportunity:\n${JSON.stringify(opp, null, 2)}`;

          const scoringRes = await callLLM({
            task: "scout_eligibility_analysis", // Using this task maps to claude-sonnet-4-6
            system: scoringSystem,
            prompt: scoringPrompt
          });

          // Parse JSON safely
          let score: number | null = null;
          let rationale: string | null = null;
          
          try {
             const jsonMatch = scoringRes.text.match(/\{[\s\S]*\}/);
             if (jsonMatch) {
               const parsed = JSON.parse(jsonMatch[0]);
               if (typeof parsed.score === 'number' && !isNaN(parsed.score)) {
                 score = Math.max(0, Math.min(100, parsed.score));
               }
               rationale = parsed.rationale || "No rationale provided.";
             }
          } catch (e) {
             console.error("Failed to parse scoring JSON", e);
             // Falls through to insert with nulls
          }

          /* TODO: Bypass vault-RAG match scoring for now.
             This step is scaffolding for the deferred "fix vault-RAG retrieval" wave.
             We skip fetching vault chunks and running scout_match_scoring to avoid 
             double-running LLMs and double-writing. 
             We STILL insert a grant_matches record below to prevent the PipelinePage 
             from breaking, since it depends on grant_matches.score.
          */

          // D. Persist to DB (NO early return on failure)
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
              status: opp.status || "discovered",
              tags: opp.tags || [],
              metadata: opp.metadata || {},
              relevance_score: score,
              relevance_rationale: rationale,
              scoring_model: scoringRes.model || "claude-sonnet-4-6",
              scored_at: new Date().toISOString()
            })
            .select("id")
            .single();

          if (oppErr || !oppRecord) {
             console.error("Failed to insert opp into grant_opportunities:", oppErr);
             return; // Cannot insert match if opp insert failed
          }

          // Insert into grant_matches to satisfy PipelinePage dependency.
          await supabase
            .from("grant_matches")
            .insert({
              tenant_id: tenantId,
              opportunity_id: oppRecord.id,
              score: score ?? 0, // grant_matches.score is NOT NULL constraint
              rationale: rationale || "No rationale provided.",
              evidence: [],
              status: "pending",
              eligibility_rationale: rationale || "No rationale provided.",
              scout_model: scoringRes.model || "claude-sonnet-4-6",
              vault_context_used: null
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
