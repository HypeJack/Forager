import fetch from "node-fetch";

async function run() {
  const keyword = "health";
  const response = await fetch("https://api.grants.gov/v1/api/search2", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword })
  });
  const data = await response.json();
  
  const hits = data.data.oppHits;
  let keys = new Set<string>();
  for (const hit of hits) {
     Object.keys(hit).forEach(k => keys.add(k));
  }
  console.log("All unique keys across 25 hits:", Array.from(keys));
}
run();
