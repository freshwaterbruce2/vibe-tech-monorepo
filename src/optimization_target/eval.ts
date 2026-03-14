/**
 * Read-only evaluation harness for the autoresearch loop.
 * The agent must not edit this file.
 */

import { TARGET_PARAMS, validateParams } from './target';
import { fileURLToPath } from 'node:url';

const TEST_QUERIES = Array.from({ length: 100 }, (_, index) => ({
  id: `query-${index + 1}`,
  query: `Synthetic benchmark query #${index + 1}`,
  requires_high_precision: index < 85,
}));

function simulateLatency() {
  const vectorMs = 40 + TARGET_PARAMS.k * 0.6;
  const alphaMs = 30 + (1 - TARGET_PARAMS.alpha) * 20;
  const ftsMs = 25 + TARGET_PARAMS.fts_boost * 8;
  const rerankMs = TARGET_PARAMS.rerank_k * 0.9;
  const chunkMs = (2048 - TARGET_PARAMS.chunk_size) * 0.03 + TARGET_PARAMS.chunk_overlap * 0.05;
  const cacheMs = TARGET_PARAMS.cache_ttl > 0 ? -30 : 0;

  const baselineMs = 20 + vectorMs + alphaMs + ftsMs + rerankMs + chunkMs + cacheMs;

  return baselineMs + Math.max(1, (200 - TARGET_PARAMS.k) * 0.06);
}

async function runSingleQuery(): Promise<number> {
  const latency = simulateLatency();
  const started = performance.now();
  await new Promise((resolve) => setTimeout(resolve, latency));
  return Math.max(1, performance.now() - started);
}

export async function evaluate(): Promise<{
  Execution_Latency_MS: number;
}> {
  const validation = validateParams(TARGET_PARAMS);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  const latencies = await Promise.all(
    TEST_QUERIES.map(() => runSingleQuery()),
  );

  const avg = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;
  const rounded = Math.round(avg);

  return {
    Execution_Latency_MS: rounded,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  evaluate()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}
