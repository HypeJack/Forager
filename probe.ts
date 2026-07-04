import fetch from 'node-fetch';

const GRANTS_GOV_API_URL = "https://api.grants.gov/v1/api/search2";

async function probe(name: string, keyword: string, sortBy?: string) {
  const body: any = {
    keyword,
    oppStatuses: "forecasted|posted",
    rows: 10,
    startRecordNum: 0,
  };
  if (sortBy) {
    body.sortBy = sortBy;
  }

  const res = await fetch(GRANTS_GOV_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.log(`\n=== Variant: ${name} ===\nFailed: ${res.status}`);
    return;
  }

  const json = await res.json() as any;
  const hits = json?.data?.oppHits || [];
  const hitCount = json?.data?.hitCount || hits.length;

  console.log(`\n=== Variant: ${name} ===`);
  console.log(`Total hitCount: ${hitCount}`);
  hits.forEach((hit: any, i: number) => {
    console.log(`${i + 1}. ${hit.title}`);
  });
}

async function run() {
  await probe(
    'Current behavior (All terms + openDate|desc)',
    'STEM robotics autonomousracing AI literacy',
    'openDate|desc'
  );
  
  await probe(
    'Current terms + Relevance sort',
    'STEM robotics autonomousracing AI literacy'
  );
  
  await probe(
    'Cleaned discrete terms + Relevance sort',
    'robotics STEM education'
  );
  
  await probe(
    'Targeted: "robotics" + Relevance sort',
    'robotics'
  );

  await probe(
    'Targeted: "STEM education" + Relevance sort',
    'STEM education'
  );
  
  await probe(
    'Targeted: "artificial intelligence education" + Relevance sort',
    'artificial intelligence education'
  );

  await probe(
    'Targeted: "workforce development" + Relevance sort',
    'workforce development'
  );
}

run().catch(console.error);
