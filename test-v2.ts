import { searchGrantsGov } from './packages/agents/src/scout/sources/grants-gov';

async function run() {
  const opps = await searchGrantsGov(["STEM-robotics-autonomousracing"]);
  console.log(`\n=== V2: searchGrantsGov returned ${opps.length} opportunities ===`);
  
  if (opps.length > 0) {
    console.log("\nSample 1:", JSON.stringify(opps[0], null, 2));
    if (opps.length > 1) {
      console.log("\nSample 2:", JSON.stringify(opps[1], null, 2));
    }
    if (opps.length > 2) {
      console.log("\nSample 3:", JSON.stringify(opps[2], null, 2));
    }
  }
}
run();
