/**
 * Code-level crisis safety backstop for the Vibe Buddy chat.
 *
 * Child-safety guardrails must NOT depend solely on the LLM following its
 * system prompt — the model can be swapped to a weaker free fallback, the
 * system prompt can be dropped, or the network can fail. This module detects
 * crisis language in the child's own message and returns a fixed, supportive
 * response with real help resources, independent of any model output.
 */

export type CrisisCategory = 'self-harm' | 'abuse';

interface CrisisRule {
  category: CrisisCategory;
  patterns: RegExp[];
}

// Patterns are intentionally specific phrases (not bare words like "die") to
// avoid firing on ordinary kid speech like "this homework is killing me".
const CRISIS_RULES: CrisisRule[] = [
  {
    category: 'self-harm',
    patterns: [
      /\bkill(ing)?\s+myself\b/,
      /\bend(ing)?\s+my\s+life\b/,
      /\b(want|wanna|going)\s+to\s+die\b/,
      /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up)\b/,
      /\bno\s+(reason|point)\s+(to|in)\s+(live|living|life|be(ing)?\s+here)\b/,
      /\bsuicid(e|al)\b/,
      /\b(hurt|harm|cut|cutting|hurting)\s+myself\b/,
      /\bself[\s-]?harm\b/,
      /\bbetter\s+off\s+(dead|without\s+me)\b/,
    ],
  },
  {
    category: 'abuse',
    patterns: [
      /\b(being|getting)\s+abused\b/,
      /\bsomeone\s+(is\s+)?(hurt(ing|s)?|hit(ting|s)?|touch(ing|es|ed))\s+me\b/,
      /\b(hits|hurts|touches|touched|beats)\s+me\b/,
      /\b(scared|afraid)\s+of\s+(my\s+)?(dad|mom|mother|father|parent|uncle|aunt|brother|sister|stepdad|stepmom)\b/,
      /\b(touched|touches)\s+me\s+(in|where|somewhere)\b/,
      /\b(not|never)\s+(feel\s+)?safe\s+at\s+home\b/,
    ],
  },
];

/**
 * Returns the crisis category if the message contains crisis language, else
 * null. Case-insensitive; matches on the raw child message.
 */
export function detectCrisis(message: string): CrisisCategory | null {
  if (!message) return null;
  const text = message.toLowerCase();
  for (const rule of CRISIS_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.category;
    }
  }
  return null;
}

const SELF_HARM_RESPONSE =
  "I'm really glad you told me, and I want you to be safe. 💙 You don't have to go " +
  'through this alone. Please talk to a trusted adult right now — a parent, teacher, ' +
  'or school counselor. You can also call or text 988 (the Suicide & Crisis Lifeline) ' +
  'any time, day or night, to talk with someone who cares. If you are in immediate ' +
  'danger, call 911. You matter, and people want to help you.';

const ABUSE_RESPONSE =
  'Thank you for trusting me with this. What you feel matters, and you deserve to be ' +
  'safe. 💙 Please tell a trusted adult you feel safe with — a parent, teacher, school ' +
  'counselor, or another grown-up. You can also call or text 988 any time to talk with ' +
  'someone who will listen and help. If you are in immediate danger, call 911. This is ' +
  'not your fault.';

/** The fixed, supportive response for a detected crisis category. */
export function getCrisisResponse(category: CrisisCategory): string {
  return category === 'abuse' ? ABUSE_RESPONSE : SELF_HARM_RESPONSE;
}
