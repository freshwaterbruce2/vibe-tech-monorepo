/**
 * eval-contextual-chunking.ts — Manual A/B eval for Anthropic-style contextual
 * chunking. NOT a CI test.
 *
 * What it does:
 *   1. Indexes the test fixtures TWICE into separate LanceDB tables under a
 *      throwaway directory (NEVER touches D:\nova-agent-data\lance-db).
 *        - eval_baseline_<ts>:    contextualChunkingEnabled=false
 *        - eval_contextual_<ts>:  contextualChunkingEnabled=true
 *   2. Runs a fixed query set against both indexes.
 *   3. Reports retrieval@5 and MRR@10 lift, contextualizer token usage, and
 *      estimated USD cost (Haiku 4.5 rates).
 *
 * Prerequisites:
 *   - The OpenRouter proxy must be running at http://localhost:3001 (it is the
 *     same endpoint nova-agent uses for embeddings AND for the contextualizer
 *     chat-completion calls). Without it both runs will fail.
 *
 * How to run (from C:\dev):
 *   pnpm --filter @vibetech/mcp-rag-server exec tsx ^
 *     apps/mcp-rag-server/scripts/eval-contextual-chunking.ts
 *
 * Optional flags:
 *   --dry           Skip both index runs and print the fixture/query manifest
 *                   only. Useful to confirm the script wires up without
 *                   spending tokens.
 *   --keep          Do NOT delete the eval LanceDB tables on exit (default is
 *                   to clean up so we don't litter D:\).
 *
 * Cost guard: each fixture is small (5 files, ~30 chunks total). One full
 * contextual run is ~30 contextualizer calls = a few cents at Haiku 4.5
 * cached-read rates. The eval queries are embedding-only.
 */

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// NOTE: the @nova-rag/* tsconfig path aliases are resolved by tsup at build
// time, not by tsx at runtime. Eval imports therefore reach into nova-agent
// source directly. Same effect, no bundler step needed for a one-off script.
import { RAGIndexer } from '../../nova-agent/src/rag/indexer.js';
import { RAGRetriever } from '../../nova-agent/src/rag/retriever.js';
import { DEFAULT_RAG_CONFIG } from '../src/rag/types.js';
import type { RAGConfig, SearchResult } from '../src/rag/types.js';

// ─── Config ─────────────────────────────────────────────────────────────────

const FIXTURES_ROOT = resolve(__dirname, '..', 'test-fixtures');
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const KEEP = args.has('--keep');

// Pricing (USD per 1M tokens) — Haiku 4.5 via OpenRouter, verified 2026-04-25.
// See: https://openrouter.ai/anthropic/claude-haiku-4.5
const HAIKU_PRICE = {
  inputPerM: 1.0,
  cachedInputPerM: 0.1,
  outputPerM: 5.0,
  cacheWrite5mPerM: 1.25,
};

// Queries chosen so the chunk being retrieved benefits from doc-level context
// (e.g. "what does the auth module do" — a function chunk standing alone may
// not match without the file-level header).
interface EvalQuery {
  text: string;
  /** filePath substring(s) of the chunks that should appear in top-K. */
  expectedFiles: string[];
}

const QUERIES: EvalQuery[] = [
  { text: 'how does login work in this app', expectedFiles: ['auth-service.ts'] },
  { text: 'JWT bearer token validation', expectedFiles: ['auth-service.ts'] },
  { text: 'what does the auth module do', expectedFiles: ['auth-service.ts'] },
  { text: 'reject too many requests from one client', expectedFiles: ['rate-limiter.ts'] },
  { text: 'token bucket algorithm', expectedFiles: ['rate-limiter.ts'] },
  { text: 'order processing pipeline stages', expectedFiles: ['order-pipeline.ts'] },
  { text: 'compensating transaction rollback', expectedFiles: ['order-pipeline.ts'] },
  { text: 'charge a Stripe payment intent', expectedFiles: ['order-pipeline.ts'] },
  { text: 'how do we cache product lookups', expectedFiles: ['cache-layer.ts'] },
  { text: 'two tier read through cache', expectedFiles: ['cache-layer.ts'] },
  { text: 'LRU eviction in process memory', expectedFiles: ['cache-layer.ts'] },
  { text: 'sign outbound webhook payloads', expectedFiles: ['webhook-dispatcher.ts'] },
  { text: 'HMAC SHA256 signature on POST', expectedFiles: ['webhook-dispatcher.ts'] },
  { text: 'retry with exponential backoff', expectedFiles: ['webhook-dispatcher.ts'] },
  { text: 'reject payloads larger than 1 MB', expectedFiles: ['webhook-dispatcher.ts'] },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(opts: { lanceDbPath: string; contextual: boolean }): RAGConfig {
  return {
    ...DEFAULT_RAG_CONFIG,
    lanceDbPath: opts.lanceDbPath,
    cachePath: join(opts.lanceDbPath, 'cache.sqlite'),
    hashIndexPath: join(opts.lanceDbPath, 'hashes.json'),
    logPath: join(opts.lanceDbPath, 'log.txt'),
    workspaceRoot: resolve(FIXTURES_ROOT, '..'),
    indexPaths: ['test-fixtures/'],
    autoIndexIntervalMs: 0,
    excludePatterns: [
      ...DEFAULT_RAG_CONFIG.excludePatterns.filter((p) => !p.includes('test')),
    ],
    contextualChunkingEnabled: opts.contextual,
  };
}

interface QueryScore {
  hitAt5: number;
  reciprocalRank10: number;
  topResults: SearchResult[];
}

function scoreResults(results: SearchResult[], expected: string[]): QueryScore {
  const hitAt5 = results
    .slice(0, 5)
    .some((r) => expected.some((e) => r.chunk.filePath.includes(e)))
    ? 1
    : 0;
  let rr = 0;
  for (let i = 0; i < Math.min(results.length, 10); i++) {
    const r = results[i]!;
    if (expected.some((e) => r.chunk.filePath.includes(e))) {
      rr = 1 / (i + 1);
      break;
    }
  }
  return { hitAt5, reciprocalRank10: rr, topResults: results.slice(0, 5) };
}

async function runIndexAndQueries(label: string, config: RAGConfig) {
  const indexer = new RAGIndexer(config);
  await indexer.init();
  console.log(`[${label}] indexing ${FIXTURES_ROOT}...`);
  const idxResult = await indexer.index({ full: true });
  console.log(
    `[${label}] indexed: ${idxResult.filesProcessed} files, ${idxResult.chunksCreated} chunks, ${idxResult.errors.length} errors, ${idxResult.durationMs}ms`,
  );
  if (idxResult.errors.length) console.log(`[${label}] errors:`, idxResult.errors);

  const table = indexer.getTable();
  if (!table) throw new Error(`[${label}] no table after index`);

  const retriever = new RAGRetriever({
    embeddingEndpoint: config.embeddingEndpoint,
    embeddingModel: config.embeddingModel,
    searchPoolSize: config.searchPoolSize,
  });

  const scores: QueryScore[] = [];
  for (const q of QUERIES) {
    const candidates = await retriever.search(table, { text: q.text, limit: 10 });
    // Map RerankCandidate[] → SearchResult[]-ish for scoring (we only need filePath).
    const asResults: SearchResult[] = candidates.map((c) => ({
      chunk: c.chunk,
      score: c.vectorScore,
      vectorScore: c.vectorScore,
      ftsScore: c.ftsScore,
      source: 'hybrid',
    }));
    scores.push(scoreResults(asResults, q.expectedFiles));
  }
  return { scores, indexer };
}

function summarize(scores: QueryScore[]): { recall5: number; mrr10: number } {
  const recall5 = scores.reduce((a, s) => a + s.hitAt5, 0) / scores.length;
  const mrr10 = scores.reduce((a, s) => a + s.reciprocalRank10, 0) / scores.length;
  return { recall5, mrr10 };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(72));
  console.log('Contextual Chunking Eval — manual A/B benchmark');
  console.log('='.repeat(72));
  console.log(`Fixtures dir: ${FIXTURES_ROOT}`);
  console.log(`Queries:      ${QUERIES.length}`);
  console.log(`Mode:         ${DRY ? 'DRY (no indexing, no LLM calls)' : 'LIVE'}`);
  console.log('');

  if (!existsSync(FIXTURES_ROOT)) {
    throw new Error(`Fixtures directory missing: ${FIXTURES_ROOT}`);
  }

  if (DRY) {
    console.log('Dry run — manifest:');
    for (const q of QUERIES) {
      console.log(`  - "${q.text}"  expects: ${q.expectedFiles.join(', ')}`);
    }
    console.log('');
    console.log('Skipping indexing. Re-run without --dry to execute.');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const evalRoot = mkdtempSync(join(tmpdir(), `rag-eval-${stamp}-`));
  const baselineDb = join(evalRoot, `eval_baseline_${stamp}`);
  const contextualDb = join(evalRoot, `eval_contextual_${stamp}`);
  console.log(`Eval LanceDB root: ${evalRoot}`);
  console.log('');

  let baselineSummary = { recall5: 0, mrr10: 0 };
  let contextualSummary = { recall5: 0, mrr10: 0 };
  let ctxStats = {
    documentsProcessed: 0,
    chunksProcessed: 0,
    promptTokens: 0,
    cachedPromptTokens: 0,
    completionTokens: 0,
    apiCalls: 0,
    failures: 0,
  };

  try {
    // Baseline
    const baseline = await runIndexAndQueries(
      'baseline',
      makeConfig({ lanceDbPath: baselineDb, contextual: false }),
    );
    baselineSummary = summarize(baseline.scores);

    // Contextual
    const contextual = await runIndexAndQueries(
      'contextual',
      makeConfig({ lanceDbPath: contextualDb, contextual: true }),
    );
    contextualSummary = summarize(contextual.scores);

    const internal = contextual.indexer as unknown as {
      contextualizer: { getStats: () => typeof ctxStats } | null;
    };
    if (internal.contextualizer) ctxStats = internal.contextualizer.getStats();
  } finally {
    if (!KEEP) {
      try {
        rmSync(evalRoot, { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors */
      }
    }
  }

  // Cost estimate
  const writtenTokens = Math.max(0, ctxStats.promptTokens - ctxStats.cachedPromptTokens);
  const cacheReadCost = (ctxStats.cachedPromptTokens / 1_000_000) * HAIKU_PRICE.cachedInputPerM;
  const writeCost = (writtenTokens / 1_000_000) * HAIKU_PRICE.cacheWrite5mPerM;
  const completionCost = (ctxStats.completionTokens / 1_000_000) * HAIKU_PRICE.outputPerM;
  const totalCost = cacheReadCost + writeCost + completionCost;

  console.log('');
  console.log('='.repeat(72));
  console.log('Leaderboard');
  console.log('='.repeat(72));
  const fmt = (n: number) => (n * 100).toFixed(1).padStart(5) + '%';
  console.log(`Variant       Recall@5    MRR@10`);
  console.log(`baseline      ${fmt(baselineSummary.recall5)}     ${fmt(baselineSummary.mrr10)}`);
  console.log(`contextual    ${fmt(contextualSummary.recall5)}     ${fmt(contextualSummary.mrr10)}`);
  console.log(
    `delta         ${fmt(contextualSummary.recall5 - baselineSummary.recall5)}     ${fmt(
      contextualSummary.mrr10 - baselineSummary.mrr10,
    )}`,
  );
  console.log('');
  console.log('Contextualizer usage');
  console.log('-'.repeat(72));
  console.log(`  documents:           ${ctxStats.documentsProcessed}`);
  console.log(`  chunks contextualized: ${ctxStats.chunksProcessed}`);
  console.log(`  api calls:           ${ctxStats.apiCalls}  (failures: ${ctxStats.failures})`);
  console.log(`  prompt tokens:       ${ctxStats.promptTokens.toLocaleString()}`);
  console.log(`  cached read tokens:  ${ctxStats.cachedPromptTokens.toLocaleString()}`);
  console.log(`  completion tokens:   ${ctxStats.completionTokens.toLocaleString()}`);
  console.log('');
  console.log('Cost estimate (Haiku 4.5 via OpenRouter)');
  console.log('-'.repeat(72));
  console.log(`  cache reads:         $${cacheReadCost.toFixed(6)}`);
  console.log(`  cache writes (5m):   $${writeCost.toFixed(6)}`);
  console.log(`  completions:         $${completionCost.toFixed(6)}`);
  console.log(`  TOTAL:               $${totalCost.toFixed(6)}`);
  console.log('');
  console.log(
    KEEP
      ? `Tables retained at ${evalRoot}`
      : 'Eval tables cleaned up. Use --keep to retain for inspection.',
  );
}

main().catch((err) => {
  console.error('Eval failed:', err);
  process.exit(1);
});
