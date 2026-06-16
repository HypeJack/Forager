import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_EVENTS = [
  "architect/draft.requested",
  "vault/document.uploaded",
  "liaison/task.requested",
  "scout/run.requested"
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, data } = await req.json();

    if (!ALLOWED_EVENTS.includes(name)) {
      return new Response(JSON.stringify({ error: `Event '${name}' is not permitted.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const INNGEST_EVENT_KEY = Deno.env.get("INNGEST_EVENT_KEY");
    if (!INNGEST_EVENT_KEY) {
      throw new Error("INNGEST_EVENT_KEY environment variable is not set");
    }

    // Default to production Inngest URL, can be overridden by INNGEST_BASE_URL (e.g. for local dev)
    const inngestBaseUrl = Deno.env.get("INNGEST_BASE_URL") || "https://inn.gs";
    const inngestEndpoint = `${inngestBaseUrl}/e/${INNGEST_EVENT_KEY}`;

    const inngestPayload = {
      name,
      data
    };

    const response = await fetch(inngestEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(inngestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Inngest API error (${response.status}):`, errorText);
      return new Response(JSON.stringify({ error: "Failed to forward event to Inngest" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in emit-inngest-event:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
