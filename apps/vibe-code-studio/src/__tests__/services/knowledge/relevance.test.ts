/**
 * relevance tests — tokenize / jaccard / scoreKnowledge (spec 04 Phase 1).
 * Pure module: no mocks needed.
 */
import { describe, expect, it } from 'vitest';
import { jaccard, scoreKnowledge, tokenize } from '../../../services/knowledge/relevance';
import type { KnowledgeItem } from '../../../services/knowledge/types';

const item = (overrides: Partial<KnowledgeItem> = {}): KnowledgeItem => ({
  id: 'knowledge-1',
  title: 'title words',
  content: 'content words',
  category: 'general',
  scopeGlobs: [],
  sourceSessionId: 'manual',
  createdAt: '2026-07-05T00:00:00.000Z',
  updatedAt: '2026-07-05T00:00:00.000Z',
  ...overrides,
});

describe('tokenize', () => {
  it('lowercases tokens', () => {
    const tokens = tokenize('Alpha BETA GaMmA');
    expect(tokens.has('alpha')).toBe(true);
    expect(tokens.has('beta')).toBe(true);
    expect(tokens.has('gamma')).toBe(true);
    expect(tokens.has('Alpha')).toBe(false);
  });

  it('drops tokens shorter than 3 characters', () => {
    const tokens = tokenize('go to the market on x1');
    expect(tokens.has('go')).toBe(false);
    expect(tokens.has('to')).toBe(false);
    expect(tokens.has('x1')).toBe(false);
    expect(tokens.has('the')).toBe(true);
    expect(tokens.has('market')).toBe(true);
  });

  it('splits on non-alphanumeric characters (dashes, underscores, dots, slashes)', () => {
    const tokens = tokenize('foo-bar_baz.qux/2026 spec#04');
    expect([...tokens].sort()).toEqual(['2026', 'bar', 'baz', 'foo', 'qux', 'spec']);
  });

  it('deduplicates repeated tokens into a set', () => {
    const tokens = tokenize('kraken kraken KRAKEN');
    expect(tokens.size).toBe(1);
  });

  it('returns an empty set for empty or all-short input', () => {
    expect(tokenize('').size).toBe(0);
    expect(tokenize('a b c 12').size).toBe(0);
    expect(tokenize('---').size).toBe(0);
  });
});

describe('jaccard', () => {
  it('returns 0 when either set is empty', () => {
    expect(jaccard(new Set(), new Set(['alpha']))).toBe(0);
    expect(jaccard(new Set(['alpha']), new Set())).toBe(0);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  it('returns 1 for identical non-empty sets', () => {
    const a = new Set(['alpha', 'beta']);
    const b = new Set(['beta', 'alpha']);
    expect(jaccard(a, b)).toBe(1);
  });

  it('returns 0 for disjoint non-empty sets', () => {
    expect(jaccard(new Set(['alpha']), new Set(['beta']))).toBe(0);
  });

  it('returns intersection over union for partial overlap', () => {
    const a = new Set(['alpha', 'beta']);
    const b = new Set(['beta', 'gamma']);
    // intersection = 1 (beta), union = 3
    expect(jaccard(a, b)).toBeCloseTo(1 / 3);
  });
});

describe('scoreKnowledge', () => {
  it('weights title matches double relative to body matches', () => {
    const context = 'alpha beta';
    const titleHit = item({ id: 'knowledge-title', title: 'alpha beta', content: 'zzz' });
    const bodyHit = item({ id: 'knowledge-body', title: 'zzz', content: 'alpha beta' });

    const scored = scoreKnowledge([bodyHit, titleHit], context);

    expect(scored.map(s => s.item.id)).toEqual(['knowledge-title', 'knowledge-body']);
    // titleHit: perfect title jaccard (1) * 2 + body 0 = 2
    expect(scored[0]!.score).toBe(2);
    expect(scored[1]!.score).toBeGreaterThan(0);
    expect(scored[1]!.score).toBeLessThan(2);
  });

  it('filters out zero-score items', () => {
    const miss = item({ id: 'knowledge-miss', title: 'zzz', content: 'yyy', category: 'xxx' });
    const hit = item({ id: 'knowledge-hit', title: 'alpha' });

    const scored = scoreKnowledge([miss, hit], 'alpha');

    expect(scored).toHaveLength(1);
    expect(scored[0]!.item.id).toBe('knowledge-hit');
  });

  it('lets category and content contribute to the body score', () => {
    const categoryHit = item({
      id: 'knowledge-cat',
      title: 'zzz',
      content: 'yyy',
      category: 'alpha',
    });
    const contentHit = item({
      id: 'knowledge-body',
      title: 'zzz',
      content: 'alpha',
      category: 'xxx',
    });

    const scoredCat = scoreKnowledge([categoryHit], 'alpha');
    const scoredContent = scoreKnowledge([contentHit], 'alpha');

    expect(scoredCat).toHaveLength(1);
    expect(scoredCat[0]!.score).toBeGreaterThan(0);
    expect(scoredContent).toHaveLength(1);
    expect(scoredContent[0]!.score).toBeGreaterThan(0);
  });

  it('sorts by score descending and keeps insertion order for ties (stable sort)', () => {
    const strong = item({ id: 'knowledge-strong', title: 'alpha beta gamma' });
    const tieFirst = item({ id: 'knowledge-tie-1', title: 'alpha zzz1' });
    const tieSecond = item({ id: 'knowledge-tie-2', title: 'alpha zzz2' });

    const scored = scoreKnowledge([tieFirst, tieSecond, strong], 'alpha beta gamma');

    expect(scored.map(s => s.item.id)).toEqual([
      'knowledge-strong',
      'knowledge-tie-1',
      'knowledge-tie-2',
    ]);
    expect(scored[1]!.score).toBe(scored[2]!.score);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1]!.score).toBeGreaterThanOrEqual(scored[i]!.score);
    }
  });

  it('returns an empty array for an empty context or empty item list', () => {
    expect(scoreKnowledge([], 'alpha')).toEqual([]);
    expect(scoreKnowledge([item()], '')).toEqual([]);
  });
});
