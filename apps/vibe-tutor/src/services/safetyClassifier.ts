/**
 * LLM child-safety classifier — the online "Tier-3" layer above the regex floor.
 *
 * The regex backstop in crisisDetection.ts is a deterministic FLOOR for the
 * clearest signals; a white-box red-team proved it cannot be exhaustive. This
 * module adds a higher-sensitivity LLM classifier that runs on the online path
 * to catch the indirect / oblique / somatic disclosures a finite pattern set
 * misses. The regex remains the offline / last-resort floor.
 *
 * Design (see plan): a dedicated layer, decoupled from the answer, biased for
 * RECALL on detection but FAIL-OPEN on any error — it must never block a child
 * from the app or become a new failure mode (the regex floor already ran).
 * Reuses the existing backend proxy via createChatCompletion, so there is no new
 * provider and no backend change. Never throws: callers can await it directly.
 */

import type { CrisisCategory } from './crisisDetection';
import { createChatCompletion, type DeepSeekMessage } from './secureClient';
import { logger } from '../utils/logger';

/** Model used for classification. Swappable; cost is not a concern here. */
export const SAFETY_CLASSIFIER_MODEL = 'deepseek/deepseek-v3.2';

const CLASSIFIER_SYSTEM_PROMPT = [
  "You are a child-safety classifier for a kids' homework and companion chat app.",
  "Classify ONLY the child's latest message for a genuine crisis disclosure.",
  '',
  'Categories:',
  '- "self-harm": suicidal thoughts, intent or planning; wanting to die or',
  '  disappear; self-injury or cutting; hopelessness such as "everyone would be',
  '  better off without me"; methods (pills, stepping into traffic); a suicide note.',
  '- "abuse": physical, sexual or verbal abuse; being hit, hurt or touched by a',
  '  caregiver or family member; fear of going home or of a caregiver; neglect',
  '  (left alone for days, no food); somatic fear (hands shaking or hiding because',
  '  someone is coming).',
  '- "none": everything else.',
  '',
  'Bias toward catching REAL disclosures, including indirect, oblique or somatic',
  'ones. But do NOT flag: hyperbole ("this homework is killing me", "dying to see',
  'the movie", "die of boredom"); video-game combat ("the boss hits me", "I keep',
  'dying", "want to die every time I lose"); ordinary worry ("scared of the dark",',
  '"scared I\'ll fail the test", "mom will be mad about my grade"); everyday hunger',
  'or boredom without neglect.',
  '',
  'Respond with ONLY a JSON object and nothing else: {"category":"self-harm"} or',
  '{"category":"abuse"} or {"category":"none"}.',
].join('\n');

/**
 * Parse the model's raw output into a CrisisCategory, or null when not flagged
 * or unparseable. Defensive: tolerates surrounding text/code fences and casing.
 */
function parseCategory(raw: string | null): CrisisCategory | null {
  if (!raw) return null;
  const match = raw.match(/\{[^{}]*\}/);
  const candidate = match ? match[0] : raw;
  try {
    const parsed = JSON.parse(candidate) as { category?: unknown };
    const category =
      typeof parsed.category === 'string' ? parsed.category.toLowerCase().trim() : '';
    if (category === 'self-harm') return 'self-harm';
    if (category === 'abuse') return 'abuse';
    return null;
  } catch {
    return null;
  }
}

/**
 * Classify a child's message on the online path. Returns the crisis category to
 * surface supportive resources for, or null when clean / offline / on any error
 * (fail-open — the regex floor is the guaranteed backstop). Never rejects.
 */
export async function classifyMessageSafety(message: string): Promise<CrisisCategory | null> {
  if (!message || !message.trim()) return null;

  try {
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
      { role: 'user', content: message },
    ];
    const raw = await createChatCompletion(messages, {
      model: SAFETY_CLASSIFIER_MODEL,
      temperature: 0,
      max_tokens: 32,
      retryCount: 1,
    });
    const category = parseCategory(raw);
    if (category) {
      // Log the flag WITHOUT the disclosure text (privacy: no message content).
      logger.warn(`[SafetyClassifier] flagged category=${category}`);
    }
    return category;
  } catch (error) {
    logger.error('[SafetyClassifier] classification failed (fail-open):', error);
    return null;
  }
}
