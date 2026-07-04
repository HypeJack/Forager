import fetch from "node-fetch";

async function run() {
  const oppNum = "PD-20-144Y";
  const id = "324369";
  
  const test1 = await fetch("https://api.grants.gov/v1/api/fetchOpportunity", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oppId: id })
  });
  console.log("Test ID:", JSON.stringify(await test1.json(), null, 2));

  const test2 = await fetch("https://api.grants.gov/v1/api/fetchOpportunity", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId: id })
  });
  console.log("Test OpportunityId:", JSON.stringify(await test2.json(), null, 2));
}

run();
