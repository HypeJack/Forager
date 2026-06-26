import { GrantOpportunity } from "../types";

const GRANTS_GOV_API_URL = "https://api.grants.gov/v1/api/search2";
const GRANTS_GOV_DETAIL_URL = "https://api.grants.gov/v1/api/fetchOpportunity";

export async function searchGrantsGov(focusAreas: string[]): Promise<Partial<GrantOpportunity>[]> {
  try {
    if (!focusAreas || focusAreas.length === 0) return [];

    // Join all focus areas and replace hyphens with spaces to form human-readable terms
    const keyword = focusAreas.map(f => f.replace(/-/g, " ")).join(" ").trim();
    if (!keyword) return [];

    const response = await fetch(`${GRANTS_GOV_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: keyword,
        oppStatuses: "forecasted|posted",
        // Cap at 25 hits to control detail-fetch volume (this limits the records we process and fetch detail for)
        rows: 25, 
        startRecordNum: 0,
        sortBy: "openDate|desc"
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "No body");
      console.error(`Grants.gov API returned ${response.status}:`, errText.substring(0, 500));
      throw new Error(`Grants.gov API returned ${response.status}`);
    }

    const json = await response.json();
    const hits = json?.data?.oppHits;
    
    if (!Array.isArray(hits)) {
      return [];
    }
    
    // Enrich each hit sequentially to avoid hammering the API
    const enrichedOpps: Partial<GrantOpportunity>[] = [];
    
    for (const hit of hits) {
      let description = "Description not provided.";
      let amount_min = null;
      let amount_max = null;
      
      try {
        const detailRes = await fetch(GRANTS_GOV_DETAIL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opportunityId: hit.id })
        });
        
        if (detailRes.ok) {
          const detailJson = await detailRes.json();
          const details = detailJson?.data;
          
          if (details?.synopsis) {
            description = details.synopsis.synopsisDesc || description;
            
            const parseAmount = (val: any) => {
              if (!val || String(val).toLowerCase() === "none") return null;
              const num = parseInt(String(val).replace(/[^\d]/g, ''), 10);
              return isNaN(num) ? null : num;
            };
            
            amount_min = parseAmount(details.synopsis.awardFloor);
            amount_max = parseAmount(details.synopsis.awardCeiling);
          } else if (details?.forecast) {
            description = details.forecast.forecastDesc || description;
            // Forecast records typically only provide total estimatedFunding, not floor/ceiling per award.
            amount_min = null;
            amount_max = null;
          }
        }
      } catch (err) {
        console.error(`Failed to enrich oppId ${hit.id}:`, err);
        // Fallback to thin values, continue to next opp
      }

      enrichedOpps.push({
        title: hit.title,
        funder: hit.agency,
        description: description,
        amount_min: amount_min,
        amount_max: amount_max,
        deadline: hit.closeDate && !isNaN(new Date(hit.closeDate).getTime()) ? new Date(hit.closeDate).toISOString() : null,
        url: hit.id ? `https://www.grants.gov/search-results-detail/${hit.id}` : "https://www.grants.gov",
        status: "discovered",
        tags: ["federal", ...(hit.cfdaList ? hit.cfdaList.map((c: string) => `CFDA ${c}`) : [])]
      });
    }
    
    return enrichedOpps;
  } catch (error) {
    console.error("Grants.gov fetch failed:", error);
    return [];
  }
}
