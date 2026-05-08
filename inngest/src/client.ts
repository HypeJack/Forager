import { Inngest } from "inngest";

/**
 * Shared Inngest client.
 * All Forager background functions use this client.
 */
export const inngest = new Inngest({
  id: "forager",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
