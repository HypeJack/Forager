import { serve } from "inngest/edge";
import { 
  inngest, 
  architectStream, 
  processVaultDocument, 
  runLiaisonAgent, 
  runScoutAgent 
} from "@forager/inngest";

// Ensure Inngest keys are verified before execution
if (!process.env.INNGEST_EVENT_KEY || !process.env.INNGEST_SIGNING_KEY) {
  console.warn("Missing INNGEST_EVENT_KEY or INNGEST_SIGNING_KEY in environment variables.");
}

export default serve({
  client: inngest,
  functions: [
    architectStream,
    processVaultDocument,
    runLiaisonAgent,
    runScoutAgent
  ]
});
