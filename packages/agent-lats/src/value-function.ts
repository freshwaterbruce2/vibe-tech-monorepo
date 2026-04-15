import type { SuccessPattern, ScoreBreakdown, ApproachSource } from './types.js';

const UCB1_C = Math.SQRT2; // exploration constant ≈ 1.414

/**
 * Tokenise a string into lowercase keywords, stripping stop words.
 * Used for similarity scoring between task descriptions and patterns.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'in', 'of', 'on', 'at', 'is', 'it',
  'and', 'or', 'with', 'that', 'this', 'from', 'by', 'be', 'as', 'are',
  'was', 'were', 'use', 'using', 'used', 'when', 'if', 'so', 'do', 'not',
]);

export function tokenise(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/** Jaccard similarity between two token sets */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Score a pattern against a task description — pure keyword similarity */
export function patternSimilarity(taskTokens: Set<string>, pattern: SuccessPattern): number {
  const patternTokens = tokenise(pattern.description + ' ' + pattern.patternType);
  return jaccardSimilarity(taskTokens, patternTokens);
}

/**
 * UCB1 exploration bonus.
 * Returns 0 when the node has never been visited (pure exploitation first).
 */
export function ucb1Bonus(totalVisits: number, nodeVisits: number, c = UCB1_C): number {
  if (nodeVisits === 0 || totalVisits === 0) return 0;
  return c * Math.sqrt(Math.log(totalVisits) / nodeVisits);
}

/**
 * Compute the composite value score for a candidate approach.
 *
 * Weights:
 *   40% pattern similarity  — how well the pattern matches the task
 *   30% confidence score    — how proven this pattern is in the DB
 *   20% historical success  — actual success rate for similar executions
 *   10% UCB1 bonus          — exploration (increases as other nodes are visited)
 */
export function computeScore(opts: {
  taskTokens: Set<string>;
  pattern: SuccessPattern | null;
  approachSource: ApproachSource;
  historicalSuccessRate: number;
  totalTreeVisits: number;
  nodeVisits: number;
  explorationConstant?: number;
}): ScoreBreakdown {
  const { taskTokens, pattern, approachSource, historicalSuccessRate, totalTreeVisits, nodeVisits } = opts;
  const c = opts.explorationConstant ?? UCB1_C;

  const similarity = pattern ? patternSimilarity(taskTokens, pattern) : sourceBaseSimilarity(approachSource);
  const confidence = pattern ? pattern.confidenceScore : sourceBaseConfidence(approachSource);
  const historical = historicalSuccessRate;
  const bonus = ucb1Bonus(totalTreeVisits, nodeVisits, c);

  const final =
    0.4 * similarity +
    0.3 * confidence +
    0.2 * historical +
    0.1 * Math.min(1, bonus);

  return { patternSimilarity: similarity, confidenceScore: confidence, historicalSuccessRate: historical, ucb1Bonus: bonus, final };
}

/**
 * Base similarity score for non-pattern approaches.
 * These are heuristics — pattern-matched approaches can beat them when relevant.
 */
function sourceBaseSimilarity(source: ApproachSource): number {
  switch (source) {
    case 'search_first': return 0.6;   // generic but often right
    case 'iterative':    return 0.5;   // conservative
    case 'thorough':     return 0.55;  // good but slow
    case 'random':       return 0.3;
    default:             return 0.5;
  }
}

function sourceBaseConfidence(source: ApproachSource): number {
  switch (source) {
    case 'search_first': return 0.65;
    case 'iterative':    return 0.6;
    case 'thorough':     return 0.6;
    case 'random':       return 0.3;
    default:             return 0.5;
  }
}
