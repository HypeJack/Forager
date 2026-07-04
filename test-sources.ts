import { searchGrantsGov } from "./packages/agents/src/scout/sources/grants-gov.js";
import { browseLillyEndowment } from "./packages/agents/src/scout/sources/lilly-endowment.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  console.time("searchGrantsGov");
  const grants = await searchGrantsGov(["STEM robotics autonomousracing"]);
  console.timeEnd("searchGrantsGov");
  console.log("Grants count:", grants.length);

  console.time("browseLillyEndowment");
  const lilly = await browseLillyEndowment();
  console.timeEnd("browseLillyEndowment");
  console.log("Lilly count:", lilly.length);
}

run();
