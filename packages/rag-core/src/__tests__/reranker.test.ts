import { describe, expect, it } from 'vitest';
import { RAGReranker } from '../reranker.js';
import type { Chunk, RerankCandidate } from '../types.js';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function chunk(id: string, createdAt = NOW): Chunk {
  return {
    id,
    filePath: `apps/example/${id}.ts`,
    content: `export const ${id.replace(/[^a-zA-Z0-9_]/g, '_')} = true;`,
    type: 'function',
    startLine: 1,
    endLine: 3,
    language: 'typescript',
    tokenCount: 12,
    createdAt,
  };
}

function candidate(
  id: string,
  vectorRank: number,
  ftsRank: number,
  createdAt = NOW,
): RerankCandidate {
  return {
    chunk: chunk(id, createdAt),
    vectorRank,
    ftsRank,
    vectorScore: vectorRank > 0 ? 1 / vectorRank : 0,
    ftsScore: ftsRank > 0 ? 10 / ftsRank : 0,
  };
}

describe('RAGReranker RRF fusion', () => {
  it('fuses dense vector and sparse FTS rankings ahead of single-source matches', async () => {
    const reranker = new RAGReranker({ rrfK: 60 });

    const result = await reranker.rerank(
      [
        candidate('vector-only-rank-1', 1, 0),
        candidate('sparse-only-rank-1', 0, 1),
        candidate('hybrid-rank-2-2', 2, 2),
      ],
      'hybrid search',
      3,
    );

    expect(result.method).toBe('rrf');
    expect(result.results.map((r) => r.chunk.id)).toEqual([
      'hybrid-rank-2-2',
      'vector-only-rank-1',
      'sparse-only-rank-1',
    ]);
    expect(result.results[0]?.source).toBe('hybrid');
    expect(result.results[1]?.source).toBe('vector');
    expect(result.results[2]?.source).toBe('fts');
  });

  it('applies recency boosts in JavaScript without requiring every chunk to have createdAt', async () => {
    const reranker = new RAGReranker({
      rrfK: 60,
      recency: {
        enabled: true,
        weight: 2,
        halfLifeMs: DAY,
        now: NOW,
      },
    });

    const oldHybrid = candidate('old-hybrid', 2, 2, NOW - 10 * DAY);
    const freshHybrid = candidate('fresh-hybrid', 2, 2, NOW);
    const legacyHybrid = candidate('legacy-hybrid', 2, 2, Number.NaN);

    const result = await reranker.rerank(
      [oldHybrid, freshHybrid, legacyHybrid],
      'recency boost',
      3,
    );

    expect(result.results.map((r) => r.chunk.id)).toEqual([
      'fresh-hybrid',
      'old-hybrid',
      'legacy-hybrid',
    ]);
    expect(result.results.every((r) => Number.isFinite(r.score))).toBe(true);
  });
});
