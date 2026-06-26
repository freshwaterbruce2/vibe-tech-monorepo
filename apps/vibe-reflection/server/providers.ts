/**
 * Provider abstraction — OpenRouter client.
 * Configured to route through the local proxy server.
 */
import { OpenRouterClient } from '@vibetech/openrouter-client';
import type { Response } from 'express';
import { sendEvent } from './events.js';

// Load environment variables dynamically in Node 20.6+
try {
  process.loadEnvFile();
} catch {
  // Ignore missing .env
}

const proxyUrl = process.env.OPENROUTER_PROXY_URL ?? 'http://localhost:3001';
export const openRouterClient = new OpenRouterClient(proxyUrl);

// ── Fallback Stack ───────────────────────────────────────────────────────────
export const FALLBACK_STACK = [
  'cohere/north-mini-code:free',
  'deepseek/deepseek-v4-flash',
  'anthropic/claude-sonnet-4.6',
];

// ── Pricing (per 1M tokens) ──────────────────────────────────────────────────
const PRICING: Record<string, { input: number; output: number }> = {
  'cohere/north-mini-code:free': { input: 0, output: 0 },
  'deepseek/deepseek-v4-flash':  { input: 0.09 / 1_000_000, output: 0.18 / 1_000_000 },
  'anthropic/claude-sonnet-4.6': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'kimi-k2.5':             { input: 0.60 / 1_000_000, output: 2.50 / 1_000_000 },
  'gemini-2.5-flash-lite': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
};

export function calcCost(
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number },
): number {
  const p = PRICING[model] ?? PRICING['cohere/north-mini-code:free'] ?? { input: 0, output: 0 };
  return (usage.prompt_tokens ?? 0) * p.input + (usage.completion_tokens ?? 0) * p.output;
}

// ── Generator / Reviser (OpenRouter streaming) ──────────────────────────────
export async function streamGenerate(
  res: Response,
  pass: number,
  role: 'generator' | 'reviser',
  systemPrompt: string,
  userContent: string,
): Promise<{ output: string; cost: number }> {
  let output = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let selectedModel = FALLBACK_STACK[0] ?? 'unknown';

  const stream = openRouterClient.chatStream({
    models: FALLBACK_STACK,
    max_tokens: 16_000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? '';
    if (delta) {
      output += delta;
      sendEvent(res, { type: 'token', pass, role, text: delta });
    }
    if (chunk.model) {
      selectedModel = chunk.model;
    }
    if (chunk.usage) {
      promptTokens     = chunk.usage.prompt_tokens ?? promptTokens;
      completionTokens = chunk.usage.completion_tokens ?? completionTokens;
    }
  }

  return {
    output,
    cost: calcCost(selectedModel, {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
    }),
  };
}

// ── Critic call (OpenRouter tool calling) ────────────────────────────────────
export const CRITIQUE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'submit_critique',
    description: 'Submit your structured evaluation of the output',
    parameters: {
      type: 'object',
      properties: {
        score: {
          type: 'number',
          description: 'Quality score 0.0–1.0 (0.85+ = publish-ready)',
        },
        issues: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific problems found (be concrete)',
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Actionable improvements',
        },
      },
      required: ['score', 'issues', 'suggestions'],
    },
  },
};

export async function callCritic(
  systemPrompt: string,
  userContent: string,
): Promise<{ raw: Record<string, unknown> | null; cost: number }> {
  const response = await openRouterClient.chat({
    models: FALLBACK_STACK,
    max_tokens: 2_000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    tools: [CRITIQUE_TOOL],
    tool_choice: { type: 'function', function: { name: 'submit_critique' } },
  });

  // Cast to any is necessary because the ChatMessage type definition is missing the tool_calls property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message = response.choices?.[0]?.message as any;
  const toolCall = message?.tool_calls?.[0];
  let raw: Record<string, unknown> | null = null;
  try {
    if (toolCall?.function?.arguments) {
      raw = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    }
  } catch { /* parse failure handled by caller */ }

  const selectedModel = response.model ?? FALLBACK_STACK[0] ?? 'unknown';
  const cost = calcCost(selectedModel, {
    prompt_tokens:     response.usage?.prompt_tokens     ?? 0,
    completion_tokens: response.usage?.completion_tokens ?? 0,
  });

  return { raw, cost };
}
