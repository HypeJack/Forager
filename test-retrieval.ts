import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
    const query = "How many youth participate in the 2026 regional program?";
    const tenantId = "b57c55ff-7996-452b-931b-5aaadbb1a862";

    console.log(`1. Generating embedding for: "${query}"`);
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 1536,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    console.log("2. Calling hybrid_search_vault...");
    const { data, error } = await supabase.rpc("hybrid_search_vault", {
        query_text: query,
        query_embedding: queryEmbedding,
        p_tenant_id: tenantId,
        match_count: 3,
        vector_weight: 0.6,
        fts_weight: 0.4,
        similarity_floor: 0.2,
    });

    if (error) return console.error("RPC Error:", error);

    console.log(`\n✅ Retrieved ${data.length} chunks:\n`);
    data.forEach((r: any, i: number) => {
        console.log(`[Rank ${i + 1}] Hybrid Score: ${r.hybrid_score.toFixed(3)} (Vector: ${r.vector_score.toFixed(3)} | FTS: ${r.fts_score.toFixed(3)})`);
        console.log(`From Document: ${r.document_title}`);
        console.log(`Preview: ${r.content.substring(0, 150).replace(/\n/g, ' ')}...\n`);
    });
}

run();