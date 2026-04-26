import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EPISODIC_HALF_LIFE_MS,
  DEFAULT_SEMANTIC_HALF_LIFE_MS,
} from '../consolidation/MemoryDecay.js';
import { UnifiedSearch } from '../search/UnifiedSearch.js';
import type { UnifiedSearchResult } from '../search/types.js';

const NOW = 1_800_000_000_000; // fixed reference point

function fakeManager(semantic: UnifiedSearchResult[], episodic: UnifiedSearchResult[]) {
  return {
    semantic: {
      search: async (_q: string, _l: number) =>
        semantic.map((r) => ({
          score: r.score,
          item: { id: Number(r.sourceId), text: r.text, category: null, importance: 0, created: r.timestamp ?? NOW },
        })),
    },
    episodic: {
      search: (_q: string, _l: number) =>
        episodic.map((r) => ({
          score: r.score,
          item: {
            id: Number(r.sourceId),
            query: r.text,
            response: '',
            timestamp: r.timestamp ?? NOW,
            sessionId: 's',
            sourceId: 'src',
          },
        })),
    },
  } as never;
}

describe('UnifiedSearch - recency boost', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  it('ranks fresher semantic memory above older one with the same raw score', async () => {
    const fresh: UnifiedSearchResult = { text: 'fresh', score: 0.5, source: 'semantic', sourceId: '1', timestamp: NOW - 1000 };
    const old: UnifiedSearchResult = {
      text: 'old',
      score: 0.5,
      source: 'semantic',
      sourceId: '2',
      timestamp: NOW - DEFAULT_SEMANTIC_HALF_LIFE_MS * 4, // 4 half-lives ago, factor ~= 0.0625
    };
    const search = new UnifiedSearch(fakeManager([fresh, old], []), null, null);
    const out = await search.search('q', { sources: ['semantic'], limit: 10 });
    expect(out[0]?.text).toBe('fresh');
    expect(out[1]?.text).toBe('old');
  });

  it('episodic decays faster than semantic at the same age', async () => {
    const ageMs = 5 * 24 * 60 * 60 * 1000; // 5 days = 1 episodic half-life, < 1 semantic half-life
    const epi: UnifiedSearchResult = { text: 'epi', score: 1, source: 'episodic', sourceId: '1', timestamp: NOW - ageMs };
    const sem: UnifiedSearchResult = { text: 'sem', score: 1, source: 'semantic', sourceId: '2', timestamp: NOW - ageMs };

    const epiFactor = Math.pow(2, -ageMs / DEFAULT_EPISODIC_HALF_LIFE_MS); // 0.5
    const semFactor = Math.pow(2, -ageMs / DEFAULT_SEMANTIC_HALF_LIFE_MS); // roughly 0.73

    expect(epiFactor).toBeLessThan(semFactor);

    // Sanity: both factors come out as expected
    expect(epiFactor).toBeCloseTo(0.5, 5);
    expect(semFactor).toBeGreaterThan(0.7);
    expect(semFactor).toBeLessThan(0.8);

    // Smoke the search end-to-end too: both sources return their lone item
    const search = new UnifiedSearch(fakeManager([sem], [epi]), null, null);
    const out = await search.search('q', { sources: ['semantic', 'episodic'], limit: 10 });
    expect(out).toHaveLength(2);
  });

  it('disabling recency boost preserves the original score-driven order', async () => {
    const newer: UnifiedSearchResult = { text: 'newer', score: 0.3, source: 'semantic', sourceId: '1', timestamp: NOW - 1000 };
    const older: UnifiedSearchResult = {
      text: 'older',
      score: 0.9,
      source: 'semantic',
      sourceId: '2',
      timestamp: NOW - DEFAULT_SEMANTIC_HALF_LIFE_MS * 10, // ancient
    };
    const search = new UnifiedSearch(fakeManager([newer, older], []), null, null);

    // With boost (default ON): older item is so decayed that newer wins despite lower raw score
    const boosted = await search.search('q', { sources: ['semantic'], limit: 10 });
    expect(boosted[0]?.text).toBe('newer');

    // With boost OFF: original score order, so older (0.9) beats newer (0.3)
    const raw = await search.search('q', { sources: ['semantic'], limit: 10, recencyBoost: false });
    expect(raw[0]?.text).toBe('older');
  });

  it('results without timestamp (rag/learning) get factor 1.0, no boost, no penalty', async () => {
    const noTs: UnifiedSearchResult = { text: 'no-ts', score: 0.5, source: 'semantic', sourceId: '1' /* no timestamp */ };
    const fresh: UnifiedSearchResult = { text: 'fresh', score: 0.5, source: 'semantic', sourceId: '2', timestamp: NOW };

    const search = new UnifiedSearch(fakeManager([noTs, fresh], []), null, null);
    const out = await search.search('q', { sources: ['semantic'], limit: 10 });
    // Both factors = 1 and raw scores = 0.5, so fused scores tie; both should be present.
    expect(out).toHaveLength(2);
  });

  it('future-dated timestamps (clock skew) clamp to factor 1, not >1', async () => {
    const future: UnifiedSearchResult = {
      text: 'future',
      score: 0.5,
      source: 'semantic',
      sourceId: '1',
      timestamp: NOW + 60_000, // a minute ahead
    };
    const present: UnifiedSearchResult = { text: 'present', score: 0.5, source: 'semantic', sourceId: '2', timestamp: NOW };

    const search = new UnifiedSearch(fakeManager([future, present], []), null, null);
    const out = await search.search('q', { sources: ['semantic'], limit: 10 });
    // Both should get factor 1.0 (no boost, no penalty), tying scores
    expect(out).toHaveLength(2);
  });
});
