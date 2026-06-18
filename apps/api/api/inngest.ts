import handler from "../dist/inngest.js";

export const maxDuration = 300;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
