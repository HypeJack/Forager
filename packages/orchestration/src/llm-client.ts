import { selectModel, type AgentTask } from './model-router.js';
import type { TenantPlan } from '@forager/shared/types/tenant.js';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export interface LLMRequest {
  task: AgentTask;
  plan?: TenantPlan;
  system: string;
  prompt: string;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ── Non-streaming call ─────────────────────────────────────────

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  const selection = selectModel(request.task, request.plan);

  try {
    if (selection.provider === 'anthropic') {
      const response = await anthropic.messages.create({
        model: selection.model,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: 4096,
        temperature: request.temperature ?? 0.2,
      });

      return {
        text: response.content[0].type === 'text' ? response.content[0].text : '',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } else if (selection.provider === 'google') {
      const response = await google.models.generateContent({
        model: selection.model,
        contents: request.prompt,
        config: {
          systemInstruction: request.system,
          temperature: request.temperature ?? 0.2,
        },
      });

      return {
        text: response.text || '',
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } else {
      throw new Error(`Unsupported non-streaming provider: ${selection.provider}`);
    }
  } catch (error) {
    console.error(`LLM call failed [task=${request.task} model=${selectModel(request.task, request.plan).model}]`, error);
    throw error;
  }
}

// ── Streaming call (Architect only) ───────────────────────────
// Yields token chunks asynchronously via an async generator.
// The caller is responsible for broadcasting to Supabase Realtime.

export interface StreamChunk {
  token: string;
  isDone: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export async function* streamLLM(
  request: LLMRequest
): AsyncGenerator<StreamChunk> {
  const selection = selectModel(request.task, request.plan);

  if (selection.provider !== 'anthropic') {
    // For this sprint, only Anthropic supports streaming for Architect
    // If plan routes to Google via failover, fall back to non-streaming
    const response = await callLLM(request);
    yield { token: response.text, isDone: true, ...response.usage };
    return;
  }

  const stream = anthropic.messages.stream({
    model: selection.model,
    system: request.system,
    messages: [{ role: 'user', content: request.prompt }],
    max_tokens: 8192,
    temperature: request.temperature ?? 0.3,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield { token: event.delta.text, isDone: false };
    }
  }

  const finalMessage = await stream.finalMessage();
  yield {
    token: '',
    isDone: true,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}
