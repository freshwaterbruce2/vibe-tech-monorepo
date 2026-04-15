/**
 * Provider abstraction — Moonshot generator + Gemini critics.
 * Both use the OpenAI SDK with different baseURLs (no Anthropic dependency).
 */
import OpenAI from 'openai';
import type { Response } from 'express';
import { sendEvent } from './events.js';

// ── Clients ───────────────────────────────────────────────────────────────────
export const moonshot = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY ?? '',
  baseURL: 'https://api.moonshot.ai/v1',
});

// Gemini via OpenAI-compatible endpoint (function calling supported)
export const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY ?? '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

// ── Pricing ───────────────────────────────────────────────────────────────────
const PRICING: Record<string, { input: number; output: number }> = {
  'kimi-k2.5':             { input: 0.60 / 1_000_000, output: 2.50 / 1_000_000 },
  'gemini-2.5-flash-lite': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
};

export function calcCost(
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number },
): number {
  const p = PRICING[model] ?? PRICING['kimi-k2.5']!;
  return (usage.prompt_tokens ?? 0) * p.input + (usage.completion_tokens ?? 0) * p.output;
}

// ── Model IDs ─────────────────────────────────────────────────────────────────
export const GENERATOR_MODEL = 'kimi-k2.5';
export const CRITIC_MODEL    = 'gemini-2.5-flash-lite';

// ── Generator / Reviser (Moonshot streaming) ──────────────────────────────────
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

  const stream = await moonshot.chat.completions.create({
    model: GENERATOR_MODEL,
    max_tokens: 16_000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    stream: true,
    stream_options: { include_usage: true },
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      output += delta;
      sendEvent(res, { type: 'token', pass, role, text: delta });
    }
    if (chunk.usage) {
      promptTokens     = chunk.usage.prompt_tokens;
      completionTokens = chunk.usage.completion_tokens;
    }
  }

  return { output, cost: calcCost(GENERATOR_MODEL, { prompt_tokens: promptTokens, completion_tokens: completionTokens }) };
}

// ── Critic call (Gemini via OpenAI-compatible function calling) ───────────────
export const CRITIQUE_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
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
  const response = await gemini.chat.completions.create({
    model: CRITIC_MODEL,
    max_tokens: 2_000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
    tools: [CRITIQUE_TOOL],
    tool_choice: { type: 'function', function: { name: 'submit_critique' } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  let raw: Record<string, unknown> | null = null;
  try {
    if (toolCall?.function?.arguments) {
      raw = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    }
  } catch { /* parse failure handled by caller */ }

  const cost = calcCost(CRITIC_MODEL, {
    prompt_tokens:     response.usage?.prompt_tokens     ?? 0,
    completion_tokens: response.usage?.completion_tokens ?? 0,
  });

  return { raw, cost };
}
