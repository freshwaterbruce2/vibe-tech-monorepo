/**
 * Knowledge relevance — spec 04 Phase 1. Jaccard token overlap in the
 * StrategyMemory style (approach reused, code not shared — no new similarity
 * infrastructure). Pure module.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import type { KnowledgeItem } from './types';

export interface ScoredKnowledgeItem {
  item: KnowledgeItem;
  score: number;
}

/** Lowercased word tokens (length ≥ 3 to skip glue words). */
export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3);
  return new Set(tokens);
}

/** Jaccard similarity of two token sets (0 when either is empty). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection++;
    }
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Score items against a session context string (workspace name, open file
 * paths, user request). Title matches weigh double the body.
 */
export function scoreKnowledge(items: KnowledgeItem[], context: string): ScoredKnowledgeItem[] {
  const contextTokens = tokenize(context);
  return items
    .map(item => {
      const titleScore = jaccard(tokenize(item.title), contextTokens);
      const bodyScore = jaccard(tokenize(`${item.category} ${item.content}`), contextTokens);
      return { item, score: titleScore * 2 + bodyScore };
    })
    .filter(scored => scored.score > 0)
    .sort((a, b) => b.score - a.score);
}
