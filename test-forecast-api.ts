import fetch from "node-fetch";

async function run() {
  const keyword = "health";
  
  const searchRes = await fetch("https://api.grants.gov/v1/api/search2", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, oppStatuses: "forecasted" })
  });
  const searchJson = await searchRes.json();
  const hits = searchJson.data?.oppHits || [];
  console.log(`Forecasted hits: ${hits.length}`);
  
  if (hits.length > 0) {
    const forecastHit = hits.find(h => h.docType === "forecast") || hits[0];
    console.log(`\n=== V1b-forecast: fetchOpportunity for id ${forecastHit.id} (${forecastHit.docType}) ===`);
    const detailRes = await fetch("https://api.grants.gov/v1/api/fetchOpportunity", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: forecastHit.id })
    });
    const detailJson = await detailRes.json();
    if (detailJson.data) {
       console.log("Forecast keys:", Object.keys(detailJson.data.forecast || {}));
       if (detailJson.data.forecast) {
         console.log(JSON.stringify(detailJson.data.forecast, null, 2));
       }
    }
  }
}

run();
