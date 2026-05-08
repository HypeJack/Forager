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
