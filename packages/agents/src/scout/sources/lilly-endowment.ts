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
