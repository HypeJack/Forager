import fetch from "node-fetch";

async function run() {
  const keyword = "robotics";
  
  // Correction 2: Live status filter call
  console.log("=== V1: Search2 with oppStatuses filter ===");
  const searchRes = await fetch("https://api.grants.gov/v1/api/search2", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, oppStatuses: "forecasted|posted" })
  });
  const searchJson = await searchRes.json();
  const hits = searchJson.data?.oppHits || [];
  console.log(`Hit count for 'robotics' with forecasted|posted: ${hits.length}`);
  
  if (hits.length > 0) {
    const sampleId = hits[0].id;
    console.log(`\n=== V1b: fetchOpportunity for id ${sampleId} ===`);
    const detailRes = await fetch("https://api.grants.gov/v1/api/fetchOpportunity", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oppId: sampleId })
    });
    const detailJson = await detailRes.json();
    console.log("Detail envelope keys:", Object.keys(detailJson));
    if (detailJson.data) {
       console.log("Detail data keys:", Object.keys(detailJson.data));
       const dataKeys = Object.keys(detailJson.data);
       console.log("Looking for description/synopsis, award floor/ceiling...");
       
       console.log("Synopses?", detailJson.data.synopses ? detailJson.data.synopses.length : 'no synopses array');
       if (detailJson.data.synopses && detailJson.data.synopses.length > 0) {
         console.log("First synopsis keys:", Object.keys(detailJson.data.synopses[0]));
         console.log(JSON.stringify(detailJson.data.synopses[0], null, 2));
       }
       
       console.log("Forecasts?", detailJson.data.forecasts ? detailJson.data.forecasts.length : 'no forecasts array');
       if (detailJson.data.forecasts && detailJson.data.forecasts.length > 0) {
         console.log("First forecast keys:", Object.keys(detailJson.data.forecasts[0]));
         console.log(JSON.stringify(detailJson.data.forecasts[0], null, 2));
       }
    }
  }
}

run();
