import { searchGrantsGov } from "./packages/agents/src/scout/sources/grants-gov.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const grants = await searchGrantsGov(["STEM robotics autonomousracing"]);
  
  let forecastWithRealText = 0;
  let forecastWithPlaceholder = 0;
  let synopsisWithRealText = 0;

  console.log(`Fetched ${grants.length} grants from Grants.gov`);

  for (const grant of grants) {
    const isForecast = grant.amount_min === null && grant.amount_max === null; 
    // Wait, let's just check the description text.
    const desc = grant.description || "";
    const isPlaceholder = desc.includes("Description not provided");
    
    // We can guess docType based on the placeholder or amount, but let's look closer.
    // Let's print the first 140 chars.
    console.log(`\nTitle: ${grant.title}`);
    console.log(`Amounts: ${grant.amount_min} - ${grant.amount_max}`);
    console.log(`Desc: ${desc.substring(0, 140).replace(/\n/g, " ")}...`);
    
    // Crude check
    if (isPlaceholder) {
       forecastWithPlaceholder++; // assuming placeholders only happen for forecasts where we miss the path
    } else {
       if (grant.amount_min === null) forecastWithRealText++;
       else synopsisWithRealText++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`Synopsis with real text: ${synopsisWithRealText}`);
  console.log(`Forecast with real text: ${forecastWithRealText}`);
  console.log(`Forecast with placeholder: ${forecastWithPlaceholder}`);
}

run();
