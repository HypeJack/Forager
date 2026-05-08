import { inngest } from "../client.js";
import { createClient } from "@supabase/supabase-js";
import { callLLM } from "@forager/orchestration";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * runLiaisonAgent
 * 
 * Handles CRM integration mocks and QA responses using claude-haiku-4-5.
 */
export const runLiaisonAgent = inngest.createFunction(
  {
    id: "run-liaison-agent",
    retries: 1,
  },
  { event: "liaison/task.requested" },
  async ({ event, step }) => {
    const { taskId, type, data, tenantId } = event.data as {
      taskId: string;
      type: "qa" | "summary" | "decision_ack";
      data: any;
      tenantId: string;
    };

    const runId = await step.run("init-run", async () => {
      const { data: run, error } = await supabase
        .from("agent_runs")
        .insert({
          tenant_id: tenantId,
          agent_type: "liaison",
          status: "running",
          model: "claude-haiku-4-5",
          input: { type, taskId, ...data },
          tokens_used: 0,
          triggered_by: "system"
        })
        .select("id")
        .single();
        
      if (error) throw new Error(`Failed to create run: ${error.message}`);
      return run.id;
    });

    try {
      let outputPayload: Record<string, unknown> = {};
      let tokensUsed = 0;

      if (type === "qa") {
        const qaResult = await step.run("generate-qa", async () => {
          const res = await callLLM({
            task: "liaison_qa_response",
            system: "You are the Forager Liaison agent. Draft a professional, brief response to the funder's question using the provided context. Maintain an editorial, objective tone.",
            prompt: `Question: ${data.question}\nContext: ${data.context}`,
          });
          return res;
        });
        outputPayload = { response: qaResult.text };
        tokensUsed = qaResult.usage.inputTokens + qaResult.usage.outputTokens;
      } 
      else if (type === "summary" || type === "decision_ack") {
        // CRM Sync Mock
        await step.run("mock-crm-sync", async () => {
          // Log to crm_sync_logs table
          const { error } = await supabase
            .from("crm_sync_logs")
            .insert({
              tenant_id: tenantId,
              opportunity_id: data.opportunityId,
              sync_type: type,
              payload: data,
              status: "success"
            });
            
          if (error) throw new Error(`Failed CRM sync: ${error.message}`);
          console.log(`[Mock CRM Sync] ${type} for opp ${data.opportunityId}`, data);
        });
        
        outputPayload = { synced: true, type };
      }

      await step.run("complete-run", async () => {
        await supabase
          .from("agent_runs")
          .update({
            status: "completed",
            output: { result: outputPayload, confidence: 0.95, sources: [] },
            tokens_used: tokensUsed,
            completed_at: new Date().toISOString()
          })
          .eq("id", runId);
      });

      return { success: true, type };
    } catch (error: any) {
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
