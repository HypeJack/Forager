import fetch from "node-fetch";

async function run() {
  const sampleId = "324369";
  console.log(`\n=== V1b: fetchOpportunity for id ${sampleId} ===`);
  const detailRes = await fetch("https://api.grants.gov/v1/api/fetchOpportunity", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oppId: sampleId })
  });
  const detailJson = await detailRes.json();
  console.log(JSON.stringify(detailJson, null, 2));
}

run();
