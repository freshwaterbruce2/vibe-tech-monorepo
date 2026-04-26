import { describe, expect, it } from 'vitest';
import { UnifiedSearch } from '../search/UnifiedSearch.js';
import type { UnifiedSearchResult } from '../search/types.js';

const NOW = 1_800_000_000_000;

function fakeManager(
  semantic: UnifiedSearchResult[],
  episodic: UnifiedSearchResult[],
) {
  return {
    semantic: {
      search: async (_q: string, _l: number) =>
        semantic.map((r) => ({
          score: r.score,
          item: {
            id: Number(r.sourceId),
            text: r.text,
            category: null,
            importance: 0,
            created: r.timestamp ?? NOW,
          },
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

// Synthetic-but-distinct fixtures sized to the requested token count
// (4 chars/token approx). The unique tag goes in the first 200 chars so the
// existing content-hash dedup treats each result as distinct.
const fixture = (tokens: number, tag: string) => {
  const header = `[${tag}] result entry for token-budget tests `;
  const fillerLen = Math.max(0, tokens * 4 - header.length);
  // Filler is a repeating pattern, not a single char, so it reads as text not noise.
  const filler = 'lorem ipsum dolor sit amet '.repeat(Math.ceil(fillerLen / 27)).slice(0, fillerLen);
  return header + filler;
};

describe('UnifiedSearch — token budget', () => {
  it('returns all results when no tokenBudget is set', async () => {
    const sem = Array.from({ length: 5 }, (_, i) => ({
      text: fixture(50, `s-${i}`),
      score: 1 - i * 0.1,
      source: 'semantic' as const,
      sourceId: String(i + 1),
      timestamp: NOW,
    }));
    const search = new UnifiedSearch(fakeManager(sem, []), null, null);
    const out = await search.search('q', { sources: ['semantic'], limit: 10 });
    expect(out.length).toBe(5);
  });

  it('trims a single source to fit the per-source slice (taking highest-score first)', async () => {
    // 5 results, each ~50 tokens. Budget 100 tokens with one source = 100 token slice.
    // Should keep top-2 by score (~100 tokens total).
    const sem: UnifiedSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
      text: fixture(50, `s-${i}`),
      score: 1 - i * 0.1,
      source: 'semantic' as const,
      sourceId: String(i + 1),
      timestamp: NOW,
    }));
    const search = new UnifiedSearch(fakeManager(sem, []), null, null);
    const out = await search.search('q', { sources: ['semantic'], limit: 10, tokenBudget: 100 });
    expect(out.length).toBe(2);
    // Top scores were on sourceId 1 and 2
    const ids = out.map((r) => r.sourceId).sort();
    expect(ids).toEqual(['1', '2']);
  });

  it('splits budget proportionally to weights between two sources', async () => {
    // 10 sem results @ 30 tok each, 10 epi results @ 30 tok each.
    // Budget 300, weights sem:2 epi:1 -> sem slice 200, epi slice 100.
    // Sem keeps ~6 (180/30 < 200/30 = 6.67), epi keeps ~3 (90/30 < 100/30).
    const sem: UnifiedSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
      text: fixture(30, `s-${i}`),
      score: 1 - i * 0.05,
      source: 'semantic' as const,
      sourceId: `s${i + 1}`,
      timestamp: NOW,
    }));
    const epi: UnifiedSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
      text: fixture(30, `e-${i}`),
      score: 1 - i * 0.05,
      source: 'episodic' as const,
      sourceId: `e${i + 1}`,
      timestamp: NOW,
    }));
    const search = new UnifiedSearch(fakeManager(sem, epi), null, null);
    const out = await search.search('q', {
      sources: ['semantic', 'episodic'],
      limit: 100,
      tokenBudget: 300,
      sourceWeights: { semantic: 2, episodic: 1 },
    });

    const semCount = out.filter((r) => r.source === 'semantic').length;
    const epiCount = out.filter((r) => r.source === 'episodic').length;

    expect(semCount).toBeGreaterThan(epiCount);
    // Semantic should be approximately 2x episodic count
    expect(semCount).toBeGreaterThanOrEqual(epiCount * 2 - 1);
    expect(semCount + epiCount).toBeLessThanOrEqual(10);
  });

  it('always keeps at least one result per active source even with a tiny budget', async () => {
    // Budget 10 tokens, results are 50 tokens each. Without the safety floor
    // both sources would return zero. With the floor each gets one.
    const sem: UnifiedSearchResult[] = [
      { text: fixture(50, 'sem-floor'), score: 0.9, source: 'semantic', sourceId: '1', timestamp: NOW },
    ];
    const epi: UnifiedSearchResult[] = [
      { text: fixture(50, 'epi-floor'), score: 0.9, source: 'episodic', sourceId: '2', timestamp: NOW },
    ];
    const search = new UnifiedSearch(fakeManager(sem, epi), null, null);
    const out = await search.search('q', {
      sources: ['semantic', 'episodic'],
      limit: 10,
      tokenBudget: 10,
    });
    // Both sources represented despite tight budget (safety floor)
    expect(out.some((r) => r.source === 'semantic')).toBe(true);
    expect(out.some((r) => r.source === 'episodic')).toBe(true);
  });

  it('redistributes budget when a source returns zero results', async () => {
    // Semantic empty, episodic has 5 entries. Episodic mapper wraps text in
    // "Q: ...\nA: ..." adding overhead so each result lands at ~42 tokens.
    // Budget 250 fits 5*42=210 with episodic getting full slice via redistribution.
    // Without redistribution, episodic would only get budget/2 = 125 -> 2 results.
    const epi: UnifiedSearchResult[] = Array.from({ length: 5 }, (_, i) => ({
      text: fixture(40, `e-${i}`),
      score: 1 - i * 0.1,
      source: 'episodic' as const,
      sourceId: `e${i + 1}`,
      timestamp: NOW,
    }));
    const search = new UnifiedSearch(fakeManager([], epi), null, null);
    const out = await search.search('q', {
      sources: ['semantic', 'episodic'],
      limit: 100,
      tokenBudget: 250,
    });

    expect(out.length).toBe(5);
  });

  it('omitting tokenBudget bypasses the allocator entirely', async () => {
    const sem: UnifiedSearchResult[] = Array.from({ length: 8 }, (_, i) => ({
      text: fixture(100, `bypass-${i}`), // big results, would be trimmed under any budget
      score: 1 - i * 0.05,
      source: 'semantic' as const,
      sourceId: String(i + 1),
      timestamp: NOW,
    }));
    const search = new UnifiedSearch(fakeManager(sem, []), null, null);
    const out = await search.search('q', { sources: ['semantic'], limit: 100 });
    expect(out.length).toBe(8);
  });
});
