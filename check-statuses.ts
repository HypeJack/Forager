import fetch from "node-fetch";

async function run() {
  const keyword = "health";
  
  // Test pipe delimited
  const res1 = await fetch("https://api.grants.gov/v1/api/search2", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, oppStatuses: "forecasted|posted" })
  });
  console.log("Pipe delimited status:", res1.status, await res1.text().then(t=>t.substring(0, 100)));

  // Test array
  const res2 = await fetch("https://api.grants.gov/v1/api/search2", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, oppStatuses: ["forecasted", "posted"] })
  });
  console.log("Array status:", res2.status, await res2.text().then(t=>t.substring(0, 100)));
}
run();
