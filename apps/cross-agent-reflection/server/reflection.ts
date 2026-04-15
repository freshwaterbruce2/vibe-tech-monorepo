import { z } from 'zod';
import type { Response } from 'express';
import { sendEvent, closeSSE } from './events.js';
import { streamGenerate, callCritic, calcCost, CRITIC_MODEL } from './providers.js';

// ── Guardrails ────────────────────────────────────────────────────────────────
const MAX_REFLECTIONS = 3;
const QUALITY_THRESHOLD = 0.85;
const COST_LIMIT_USD = 0.50;

// ── Critic output schema ──────────────────────────────────────────────────────
const CritiqueSchema = z.object({
  score:       z.number().min(0).max(1).describe('Quality 0-1'),
  issues:      z.array(z.string()).describe('Specific problems'),
  suggestions: z.array(z.string()).describe('Actionable improvements'),
});
type Critique = z.infer<typeof CritiqueSchema>;

// ── Critic personas (parallel dual critics) ───────────────────────────────────
const CRITIC_PERSONAS = [
  {
    id: 1 as const,
    system: `You are Critic A: a rigorous accuracy and completeness reviewer.
Focus on: factual correctness, missing critical information, logical gaps, unsupported claims.
Score 0.0–1.0 where 0.85+ means "publish-ready". Be specific and direct.`,
  },
  {
    id: 2 as const,
    system: `You are Critic B: a clarity and structure reviewer.
Focus on: readability, organization, audience fit, unnecessary jargon, pacing, concrete examples.
Score 0.0–1.0 where 0.85+ means "publish-ready". Be specific and direct.`,
  },
];

const SYSTEM_PROMPT = 'You are an expert writer and analyst. Produce thorough, accurate, well-structured output.';

// ── Generator / Reviser ───────────────────────────────────────────────────────
async function generate(
  res: Response,
  task: string,
  pass: number,
  prior?: { output: string; issues: string[]; suggestions: string[]; score: number },
): Promise<{ output: string; cost: number }> {
  const role = prior ? 'reviser' : 'generator';
  sendEvent(res, { type: 'generator_start', pass });

  const userContent = prior
    ? `Task: ${task}

Your previous attempt:
${prior.output}

Critic synthesis (score ${prior.score.toFixed(2)}):
Issues:      ${prior.issues.join(' | ')}
Suggestions: ${prior.suggestions.join(' | ')}

Revise to fully address every issue and suggestion.`
    : task;

  const { output, cost } = await streamGenerate(res, pass, role, SYSTEM_PROMPT, userContent);
  sendEvent(res, { type: 'generator_done', pass, output, cost });
  return { output, cost };
}

// ── Single critic call ────────────────────────────────────────────────────────
async function runCritic(
  res: Response,
  task: string,
  output: string,
  pass: number,
  persona: typeof CRITIC_PERSONAS[number],
): Promise<{ critique: Critique; cost: number }> {
  sendEvent(res, { type: 'critic_start', pass, criticId: persona.id });

  const { raw, cost } = await callCritic(
    persona.system,
    `Task: ${task}\n\nOutput to evaluate:\n${output}`,
  );

  const parsed = raw ? CritiqueSchema.safeParse(raw) : null;
  const critique: Critique = parsed?.success
    ? parsed.data
    : { score: 0, issues: ['Parse failed'], suggestions: [] };

  sendEvent(res, {
    type: 'critique_raw',
    pass,
    criticId: persona.id,
    score: critique.score,
    issues: critique.issues,
    suggestions: critique.suggestions,
  });

  return { critique, cost };
}

// ── Synthesize two critiques ──────────────────────────────────────────────────
function synthesize(a: Critique, b: Critique): Critique {
  const score = (a.score + b.score) / 2;
  const issues = [...new Set([...a.issues, ...b.issues])];
  const suggestions = [...new Set([...a.suggestions, ...b.suggestions])];
  return { score, issues, suggestions };
}

// ── Main reflection loop ──────────────────────────────────────────────────────
export async function runReflection(res: Response, task: string): Promise<void> {
  let totalCost = 0;
  let currentOutput = '';

  // Pass 1 — initial generation
  const init = await generate(res, task, 1);
  currentOutput = init.output;
  totalCost += init.cost;
  sendEvent(res, { type: 'cost_update', totalCost, costLimit: COST_LIMIT_USD });

  for (let pass = 1; pass <= MAX_REFLECTIONS; pass++) {
    if (totalCost >= COST_LIMIT_USD) {
      sendEvent(res, { type: 'error', message: `Cost limit $${COST_LIMIT_USD} reached` });
      break;
    }

    // Parallel dual critics
    const [resA, resB] = await Promise.all([
      runCritic(res, task, currentOutput, pass, CRITIC_PERSONAS[0]!),
      runCritic(res, task, currentOutput, pass, CRITIC_PERSONAS[1]!),
    ]);
    totalCost += resA.cost + resB.cost;

    const synth = synthesize(resA.critique, resB.critique);
    const approved = synth.score >= QUALITY_THRESHOLD;

    sendEvent(res, {
      type: 'synthesis',
      pass,
      score: synth.score,
      approved,
      issues: synth.issues,
      suggestions: synth.suggestions,
    });
    sendEvent(res, { type: 'cost_update', totalCost, costLimit: COST_LIMIT_USD });

    if (approved || pass === MAX_REFLECTIONS) break;

    // Revise
    const revised = await generate(res, task, pass + 1, {
      output: currentOutput,
      issues: synth.issues,
      suggestions: synth.suggestions,
      score: synth.score,
    });
    currentOutput = revised.output;
    totalCost += revised.cost;
    sendEvent(res, { type: 'cost_update', totalCost, costLimit: COST_LIMIT_USD });
  }

  sendEvent(res, {
    type: 'complete',
    finalOutput: currentOutput,
    totalCost,
    passes: MAX_REFLECTIONS,
  });
  closeSSE(res);
}
