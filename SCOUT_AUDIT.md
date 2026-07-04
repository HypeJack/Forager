# SCOUT_AUDIT.md

This is a read-only audit of the Scout agent and its associated systems within the Forager workspace.

## 1. The Scout worker (current implementation)

### Scout Inngest Function
`inngest/src/functions/runScoutAgent.ts`
```typescript
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
              status: "matched",
              tags: opp.tags || []
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
```

### Scout Sources & Utilities
`packages/agents/src/scout/sources/grants-gov.ts`
```typescript
import type { GrantOpportunity } from "@forager/shared";

// Base URL for the public Grants.gov API
const GRANTS_GOV_API_URL = "https://www.grants.gov/grantsws/rest/opportunities/search";

export async function searchGrantsGov(focusAreas: string[]): Promise<Partial<GrantOpportunity>[]> {
  try {
    // For MVP, we'll map focus areas broadly to an empty search keyword if no direct map
    // Grants.gov search API is somewhat limited, so we use a keyword search based on focus areas
    const keyword = focusAreas.join(" ");

    const response = await fetch(`${GRANTS_GOV_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: keyword,
        oppStatuses: "forecasted|posted",
        rows: 25,
        startRecordNum: 0,
        sortBy: "openDate|desc"
      })
    });

    if (!response.ok) {
      throw new Error(`Grants.gov API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Check if oppHits exists (the standard response format)
    if (!data || !data.oppHits) {
      return [];
    }

    return data.oppHits.map((hit: any): Partial<GrantOpportunity> => ({
      title: hit.title || hit.opportunityTitle,
      funder: hit.agency || hit.agencyName,
      description: hit.synopsis || hit.opportunitySynopsis || "Description not provided.",
      amount_min: hit.awardFloor ? parseInt(hit.awardFloor, 10) : null,
      amount_max: hit.awardCeiling ? parseInt(hit.awardCeiling, 10) : null,
      deadline: hit.closeDate ? new Date(hit.closeDate).toISOString() : null,
      url: hit.id ? `https://www.grants.gov/search-results-detail/${hit.id}` : "https://www.grants.gov",
      status: "discovered",
      tags: ["federal", ...(hit.cfdaList ? hit.cfdaList.map((c: string) => `CFDA ${c}`) : [])]
    }));
  } catch (error) {
    console.error("Grants.gov fetch failed:", error);
    return [];
  }
}
```

`packages/agents/src/scout/sources/lilly-endowment.ts`
```typescript
import * as cheerio from "cheerio";
import { callLLM } from "@forager/orchestration";
import type { GrantOpportunity } from "@forager/shared";

const LILLY_URL = "https://lillyendowment.org/opportunities/";

export async function browseLillyEndowment(): Promise<Partial<GrantOpportunity>[]> {
  try {
    // 1. Fetch HTML
    const response = await fetch(LILLY_URL);
    if (!response.ok) throw new Error(`Lilly Endowment returned ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Strip script/style tags to reduce token count
    $("script, style, svg, img, nav, footer").remove();
    const textContent = $("body").text().replace(/\s+/g, " ").trim();

    // 2. Call gemini-2.5-pro via model-router to extract structured data
    const llmResponse = await callLLM({
      task: "scout_agentic_browse",
      system: `You are an expert grant researcher. Extract current grant opportunities from the provided text.
Return the results EXACTLY as a JSON array of objects with the following keys:
- title: string
- funder: string (Always "Lilly Endowment")
- description: string
- url: string
- tags: string[] (categories or focus areas)`,
      prompt: `Extract grant opportunities from this text:\n\n${textContent.slice(0, 15000)}`, // Limit context
      temperature: 0.1
    });

    try {
      // Find the JSON array in the response
      const jsonStrMatch = llmResponse.text.match(/\[[\s\S]*\]/);
      if (!jsonStrMatch) throw new Error("No JSON array found in LLM response");
      
      const extracted = JSON.parse(jsonStrMatch[0]);
      
      return extracted.map((item: any) => ({
        ...item,
        status: "discovered" as const,
        amount_min: null,
        amount_max: null,
        deadline: null
      }));
    } catch (e) {
      console.error("Failed to parse Gemini output for Lilly:", e);
      return [];
    }

  } catch (error) {
    console.error("Lilly Endowment browse failed:", error);
    return [];
  }
}
```

### Placeholders / Stubs Flagged
- **Mocked Vault Context / Embeddings**: `inngest/src/functions/runScoutAgent.ts:98-106`
  > `// (Mocking this step due to no direct OpenAI import here, but production uses embeddings)`
  > `// For MVP, we will just fetch the top 5 chunks indiscriminately or assume it's pre-loaded`
  > `.limit(3);`
  > `const vaultContext = vaultChunks ? vaultChunks.map(c => c.content).join("\n\n") : "No vault context available.";`

## 2. How Scout is triggered

### Event Listener / Registry
- `inngest/src/functions/runScoutAgent.ts` listens for `{ event: "scout/run.requested" }`.
- `supabase/functions/emit-inngest-event/index.ts` allows this event:
```typescript
const ALLOWED_EVENTS = [
  "architect/draft.requested",
  "vault/document.uploaded",
  "liaison/task.requested",
  "scout/run.requested"
];
```

### UI Trigger
- Found in `apps/web/src/pages/OpportunitiesPage.tsx` (Lines 45-67):
```tsx
  async function handleRunScout() {
    if (!user) return;
    setRunningScout(true);

    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (userData) {
      const { error } = await supabase.rpc("trigger_scout_run", {
        p_tenant_id: userData.tenant_id
      });
      
      if (error) {
         alert("Failed to start Scout run. See console for details.");
      } else {
         alert("Scout agent run queued! Opportunities will populate shortly.");
      }
    }
    setRunningScout(false);
  }
```

### What actually happens on trigger?
The UI calls the Supabase RPC `trigger_scout_run` defined in `supabase/migrations/00010_grant_matches_scoring.sql`:
```sql
CREATE OR REPLACE FUNCTION trigger_scout_run(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  run_id UUID;
  event_key TEXT;
  response JSONB;
BEGIN
  -- Insert the pending agent run
  INSERT INTO agent_runs (tenant_id, agent_type, status, triggered_by)
  VALUES (p_tenant_id, 'scout', 'queued', auth.uid()::text)
  RETURNING id INTO run_id;

  -- Read the Inngest event key from vault secrets
  SELECT secret INTO event_key FROM vault.decrypted_secrets WHERE name = 'inngest_event_key';
  
  -- If secret doesn't exist, we'll gracefully fallback or rely on server-side triggers in production.
  -- For local development, this function expects the secret to be set.
  IF event_key IS NULL THEN
    RETURN jsonb_build_object('error', 'inngest_event_key missing in vault secrets', 'run_id', run_id);
  END IF;

  -- We would typically do an HTTP POST to Inngest here using pg_net, 
  -- but for this MVP, the frontend can also just insert into `agent_runs` 
  -- and a Postgres trigger or backend listener can emit the event.
  -- Since we want pure Supabase -> Inngest without a middle server, 
  -- we return the run_id, and let the caller know it was queued.
  
  RETURN jsonb_build_object('success', true, 'run_id', run_id);
END;
$$;
```

**Note:** Scout *could* theoretically be invoked by calling the `emit-inngest-event` Edge Function directly, but today the only frontend code executing a "trigger" is `handleRunScout` which calls the mocked Postgres RPC above.

## 3. What Scout searches / scrapes

### Real External Search / Scraping
- `searchGrantsGov`: Yes, real HTTP POST call to `https://www.grants.gov/grantsws/rest/opportunities/search`.
- `browseLillyEndowment`: Yes, real HTTP GET call to `https://lillyendowment.org/opportunities/`, parsed via Cheerio and structured via `gemini-2.5-pro` LLM extraction.

### Related Environment Variables
Referenced env vars (no secrets listed):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 4. How Scout writes results

### Schema: `grant_opportunities`
Defined in `supabase/migrations/00003_create_grants.sql`:
```sql
CREATE TABLE grant_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  funder TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount_min NUMERIC,
  amount_max NUMERIC,
  deadline TIMESTAMPTZ,
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'discovered' CHECK (
    status IN ('discovered', 'screening', 'matched', 'drafting', 'submitted', 'awarded', 'rejected', 'archived')
  ),
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Insertion Code
From `inngest/src/functions/runScoutAgent.ts:137-152`:
```typescript
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
              status: "matched",
              tags: opp.tags || []
            })
            .select("id")
            .single();
```

- **Populated Columns:** `tenant_id`, `title`, `funder`, `description`, `amount_min`, `amount_max`, `deadline`, `url`, `status` (always "matched"), and `tags`.
- **Not Populated (Null/Default):** `metadata` (defaults to `{}`), and any later-added schema fields (like `milestones` or `is_watchlist`).

## 5. Watchlist concept

### Schema Additions
Found in `supabase/migrations/00013_pipeline_watchlist_crm.sql`:
```sql
ALTER TABLE grant_opportunities
  ADD COLUMN IF NOT EXISTS is_watchlist BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_saved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN NOT NULL DEFAULT false;
```

### UI Implementation
The `OpportunitiesPage.tsx` handles tabs explicitly mapped to these boolean columns:
```typescript
    if (tab === "watchlist") {
      query = query.eq("is_watchlist", true);
    } else if (tab === "saved") {
      query = query.eq("is_saved", true);
    } else if (tab === "dismissed") {
      query = query.eq("is_dismissed", true);
    } else {
      // "discovered" tab shows items that are NOT saved and NOT dismissed
      query = query.eq("is_saved", false).eq("is_dismissed", false);
    }
```

## 6. Scout → downstream connection

### Pipeline Routing Component
`apps/web/src/pages/PipelinePage.tsx:24-30` queries the table directly without any intermediate views:
```typescript
      const { data: grantsData } = await supabase
        .from("grant_opportunities")
        .select("*");

      const { data: matchesData } = await supabase
        .from("grant_matches")
        .select("*");
```

### Architect Handoff
In `inngest/src/functions/architectStream.ts:82-89`, Architect reads a `grant_applications` table rather than `grant_opportunities`.
```typescript
    const application = await step.run("load-application", async () => {
      return getApplication(supabase as any, applicationId);
    });

    if (!application) throw new Error(`Application not found: ${applicationId}`);

    const section = application.outline.find((s) => s.id === sectionId);
```
There is a gap in the code base between discovering an opportunity (`grant_opportunities` row) and initiating a draft (`grant_applications` row).

## 7. agent_runs / Activity log

### Schema Definition
`supabase/migrations/00004_create_agent_runs.sql`
```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('scout', 'strategist', 'writer', 'reviewer')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  model TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### Who writes to it?
- **Scout:** `inngest/src/functions/runScoutAgent.ts` writes to `agent_runs` on initialization (line 22) and completion/failure (lines 177, 191).
- **Liaison:** `inngest/src/functions/runLiaisonAgent.ts` writes to `agent_runs` on initialization (line 30) and completion/failure (lines 87, 101).
- **Librarian:** `inngest/src/functions/processVaultDocument.ts` **does not** write to `agent_runs`.
- **Architect:** `inngest/src/functions/architectStream.ts` **does not** write to `agent_runs`.

### Activity Page Query
`apps/web/src/pages/AgentActivityPage.tsx:13-16`
```typescript
      const { data } = await supabase
        .from("agent_runs")
        .select("*")
        .order("created_at", { ascending: false });
```

## 8. Environment / infra sanity

### Vercel Configs
- **Frontend (`apps/web`):** Uses `vercel.json` with a rewrite to `/index.html`.
- **API Worker (`apps/api`):** Uses `vercel.json` that sets `"framework": null` and `"buildCommand": "pnpm run build"`.

### Throwaway Root Scripts
- `test-retrieval.ts`: **Present**
- `seed-app.ts`: **Present**
- `check-db.ts`: **Present**

---

## Final section: Open questions surfaced by the audit

- **Broken Inngest Trigger:** The "Run Scout" UI button invokes the `trigger_scout_run` Supabase RPC. This RPC creates an `agent_runs` record in the database, but explicitly states in a comment that it does NOT trigger the Inngest event natively (`-- We would typically do an HTTP POST to Inngest here using pg_net...`). As a result, the `scout/run.requested` event is never actually dispatched to Inngest and Scout never actually runs.
- **Mocked Embeddings in Scout:** `runScoutAgent` states `Mocking this step due to no direct OpenAI import here...` and limits its Vault context grab to the first 3 arbitrary chunks without embedding relevance mapping.
- **Architect Missing Observability:** Architect does not insert its execution stats into `agent_runs`.
- **Handoff Gap:** The Architect requires a `grant_applications` row containing an `outline`, but there is no workflow evident in Scout or the UI that transforms a matched `grant_opportunities` row into a structured `grant_applications` record.
- **Missing Liaison Agent Type Enum:** The migration `00004_create_agent_runs.sql` specifies `agent_type IN ('scout', 'strategist', 'writer', 'reviewer')`. However, `runLiaisonAgent.ts` attempts to insert `agent_type: "liaison"`. This insert will fail against the Postgres CHECK constraint.
