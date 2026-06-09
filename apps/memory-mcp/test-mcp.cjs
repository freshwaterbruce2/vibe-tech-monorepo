#!/usr/bin/env node

process.env.HYBRID_MODE = 'true';
process.env.RAG_RECENCY_BOOST = process.env.RAG_RECENCY_BOOST ?? 'true';
process.env.RAG_RECENCY_WEIGHT = process.env.RAG_RECENCY_WEIGHT ?? '2';
process.env.RAG_RECENCY_HALF_LIFE_MS =
  process.env.RAG_RECENCY_HALF_LIFE_MS ?? String(24 * 60 * 60 * 1000);

const assert = require('node:assert/strict');

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function chunk(id, createdAt = NOW) {
  const base = {
    id,
    filePath: `apps/memory-mcp/src/${id}.ts`,
    content: `export function ${id.replace(/[^a-zA-Z0-9_]/g, '_')}() { return true; }`,
    type: 'function',
    startLine: 1,
    endLine: 3,
    language: 'typescript',
    tokenCount: 16,
  };

  if (createdAt !== undefined) {
    base.createdAt = createdAt;
  }

  return base;
}

function candidate(id, vectorRank, ftsRank, createdAt = NOW) {
  return {
    chunk: chunk(id, createdAt),
    vectorRank,
    ftsRank,
    vectorScore: vectorRank > 0 ? 1 / vectorRank : 0,
    ftsScore: ftsRank > 0 ? 10 / ftsRank : 0,
  };
}

async function main() {
  assert.equal(process.env.HYBRID_MODE, 'true', 'HYBRID_MODE must be enabled');

  const { RAGReranker } = await import('@vibetech/rag-core');

  const pureRrf = new RAGReranker({ rrfK: 60 });
  const fused = await pureRrf.rerank(
    [
      candidate('dense-vector-only', 1, 0),
      candidate('sparse-code-chunks-only', 0, 1),
      candidate('code_chunks_hybrid_overlap', 2, 2),
    ],
    'merge dense vector results with sparse search results from code_chunks_',
    3,
  );

  assert.deepEqual(
    fused.results.map((r) => r.chunk.id),
    ['code_chunks_hybrid_overlap', 'dense-vector-only', 'sparse-code-chunks-only'],
    'RRF should rank dense+sparse overlap ahead of single-source matches',
  );

  const withRecency = new RAGReranker({
    rrfK: 60,
    recency: {
      enabled: true,
      weight: Number(process.env.RAG_RECENCY_WEIGHT),
      halfLifeMs: Number(process.env.RAG_RECENCY_HALF_LIFE_MS),
      now: NOW,
    },
  });

  const recency = await withRecency.rerank(
    [
      candidate('old-code_chunks_hybrid', 2, 2, NOW - 10 * DAY),
      candidate('fresh-code_chunks_hybrid', 2, 2, NOW),
      candidate('legacy-code_chunks_no_createdAt', 2, 2, Number.NaN),
    ],
    'recency boost should not require createdAt schema column',
    3,
  );

  assert.deepEqual(
    recency.results.map((r) => r.chunk.id),
    ['fresh-code_chunks_hybrid', 'old-code_chunks_hybrid', 'legacy-code_chunks_no_createdAt'],
    'recency boost should favor fresh chunks and tolerate legacy rows without createdAt',
  );
  assert.ok(
    recency.results.every((r) => Number.isFinite(r.score)),
    'recency-boosted scores should stay finite',
  );

  console.log(JSON.stringify({
    hybridMode: process.env.HYBRID_MODE,
    fusedResults: fused.results.map((r) => ({
      id: r.chunk.id,
      source: r.source,
      score: Number(r.score.toFixed(6)),
    })),
    recencyBoostedResults: recency.results.map((r) => ({
      id: r.chunk.id,
      source: r.source,
      score: Number(r.score.toFixed(6)),
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
