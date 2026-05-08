import { callLLM } from '../packages/orchestration/src/llm-client.js';

/**
 * Custom Promptfoo Provider
 * Routes eval requests through the authoritative Forager orchestration logic.
 */
export default async function provider(prompt, options) {
  const { task, plan = 'free' } = options.config || {};
  
  try {
    const response = await callLLM({
      task: task || 'scout_eligibility_analysis',
      plan,
      system: options.config.system || 'You are a helpful assistant.',
      prompt: prompt,
    });

    return {
      output: response.text,
      tokenUsage: {
        total: response.usage.inputTokens + response.usage.outputTokens,
        prompt: response.usage.inputTokens,
        completion: response.usage.outputTokens,
      },
    };
  } catch (err) {
    return {
      error: err.message,
    };
  }
}
