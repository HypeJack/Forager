async function run() {
  const searchRes = await fetch("https://api.grants.gov/v1/api/search2", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: "youth",
      oppStatuses: "forecasted",
      rows: 1,
      startRecordNum: 0
    })
  });
  const searchData = await searchRes.json();
  const hit = searchData?.data?.oppHits?.[0];
  if (!hit) { console.log("No forecast found"); return; }
  console.log("Forecast ID:", hit.id);
  
  const detailRes = await fetch("https://api.grants.gov/v1/api/fetchOpportunity", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId: hit.id })
  });
  const detailData = await detailRes.json();
  console.log(JSON.stringify(detailData, null, 2));
}
run();
