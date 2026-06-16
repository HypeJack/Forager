import handler from "../dist/inngest.js";

// Explicitly declare the Web Request signature so Vercel's @vercel/node builder
// correctly wraps the Node.js invocation with standard Web Request/Response objects.
export default async function (req: Request) {
  return await handler(req);
}
