/**
 * Per-token pricing for commonly used OpenRouter models.
 *
 * Values are stored as cost per token (not per 1M tokens) so `calcCost`
 * can multiply directly by token counts.
 */
export interface ModelPricing {
  input: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'cohere/north-mini-code:free': { input: 0, output: 0 },
  'deepseek/deepseek-v4-flash': { input: 0.09 / 1_000_000, output: 0.18 / 1_000_000 },
  'anthropic/claude-sonnet-4.6': { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
  'kimi-k2.5': { input: 0.6 / 1_000_000, output: 2.5 / 1_000_000 },
  'gemini-2.5-flash-lite': { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
};

/**
 * Calculate the approximate cost for a model given token usage.
 *
 * Falls back to the free-model pricing when the model is unknown, mirroring
 * the historical behavior of vibe-reflection's local calculator.
 */
export function calcCost(
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number },
): number {
  const freePricing = MODEL_PRICING['cohere/north-mini-code:free'] ?? { input: 0, output: 0 };
  const pricing = MODEL_PRICING[model] ?? freePricing;
  const promptCost = (usage.prompt_tokens ?? 0) * pricing.input;
  const completionCost = (usage.completion_tokens ?? 0) * pricing.output;
  return promptCost + completionCost;
}

/**
 * Default fallback model stack used by VibeTech applications when the
 * primary model is unavailable.
 */
export const DEFAULT_FALLBACK_STACK = [
  'cohere/north-mini-code:free',
  'deepseek/deepseek-v4-flash',
  'anthropic/claude-sonnet-4.6',
];
