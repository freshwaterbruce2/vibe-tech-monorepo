/**
 * RAG Benchmark Runner
 * CLI tool for evaluating retrieval quality against golden queries.
 *
 * Usage:
 *   pnpm --filter nova-agent exec tsx src/rag/eval/benchmark-runner.ts --baseline
 *   pnpm --filter nova-agent exec tsx src/rag/eval/benchmark-runner.ts --sweep rrf-k
 *   pnpm --filter nova-agent exec tsx src/rag/eval/benchmark-runner.ts --compare <runId>
 */

import { connect } from '@lancedb/lancedb';
import { RAGRetriever } from '../retriever.js';
import { RAGReranker } from '../reranker.js';
import { RAGIndexer } from '../indexer.js';
import { DEFAULT_RAG_CONFIG } from '../types.js';
import type { RAGConfig, SearchResult } from '../types.js';
import { loadGoldenQueries } from './golden-queries-loader.js';
import { computeAllMetrics, aggregateMetrics, p95Latency } from './metrics.js';
import { generateRunId, saveRun, saveBaseline, loadBaseline, saveSweepSummary } from './results-store.js';
import type {
  BenchmarkRun,
  EvalConfig,
  QueryCategory,
  QueryEvalResult,
  SweepParam,
} from './types.js';
import { SWEEP_RANGES } from './types.js';

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

interface CLIArgs {
  baseline: boolean;
  sweep?: SweepParam;
  compareRunId?: string;
  category?: QueryCategory;
  skipIndex: boolean;
  label?: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = { baseline: false, skipIndex: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--baseline':
        result.baseline = true;
        break;
      case '--sweep':
        result.sweep = args[++i] as SweepParam;
        break;
      case '--compare':
        result.compareRunId = args[++i];
        break;
      case '--category':
        result.category = args[++i] as QueryCategory;
        break;
      case '--skip-index':
        result.skipIndex = true;
        break;
      case '--label':
        result.label = args[++i];
        break;
    }
  }

  return result;
}

// ─── Core Evaluation ────────────────────────────────────────────────────────

async function evaluateConfig(
  config: EvalConfig,
  queries: import('./types.js').RelevanceJudgment[],
): Promise<BenchmarkRun> {
  const runId = generateRunId();
  const ragConfig: RAGConfig = { ...DEFAULT_RAG_CONFIG, ...config.ragConfigOverrides };

  // Connect to LanceDB
  const db = await connect(ragConfig.lanceDbPath);
  const table = await db.openTable('codebase');

  // Create retriever and reranker with config overrides
  const retriever = new RAGRetriever({
    embeddingEndpoint: ragConfig.embeddingEndpoint,
    embeddingModel: ragConfig.embeddingModel,
    searchPoolSize: config.searchPoolSize,
  });

  const reranker = new RAGReranker({ rrfK: config.rrfK });

  const maxK = Math.max(...config.evalAtK);
  const results: QueryEvalResult[] = [];

  console.log(`\n  Running ${queries.length} queries (config: ${config.label})...\n`);

  for (const judgment of queries) {
    const start = Date.now();

    // Run retrieval pipeline (cache disabled for honest measurement)
    const candidates = await retriever.search(table, {
      text: judgment.queryText,
      limit: maxK,
    });

    const reranked = await reranker.rerank(candidates, judgment.queryText, maxK);
    const latencyMs = Date.now() - start;

    // Extract file paths (deduplicate, keep first occurrence per file)
    const seen = new Set<string>();
    const resultFilePaths: string[] = [];
    const resultScores: number[] = [];

    for (const r of reranked.results) {
      if (!seen.has(r.chunk.filePath)) {
        seen.add(r.chunk.filePath);
        resultFilePaths.push(r.chunk.filePath);
        resultScores.push(r.score);
      }
    }

    // Compute metrics
    const metrics = computeAllMetrics(resultFilePaths, judgment, config.evalAtK);

    results.push({
      queryId: judgment.queryId,
      queryText: judgment.queryText,
      category: judgment.category,
      metrics,
      latencyMs,
      resultFilePaths,
      resultScores,
    });

    // Live progress
    const ndcg5 = metrics.find((m) => m.k === 5)?.ndcg ?? 0;
    const mrr = metrics.find((m) => m.k === 5)?.mrr ?? 0;
    process.stdout.write(
      `  [${judgment.queryId}] NDCG@5=${ndcg5.toFixed(3)} MRR=${mrr.toFixed(3)} ${latencyMs}ms\n`,
    );
  }

  // Aggregate
  const allMetrics = results.map((r) => r.metrics);
  const latencies = results.map((r) => r.latencyMs);
  const meanLatencyMs = latencies.reduce((s, l) => s + l, 0) / latencies.length;

  const run: BenchmarkRun = {
    runId,
    label: config.label,
    config,
    timestamp: Date.now(),
    results,
    aggregate: {
      perK: aggregateMetrics(allMetrics),
      meanLatencyMs,
      p95LatencyMs: p95Latency(latencies),
      embeddingCalls: queries.length, // 1 embed per query
      embeddingTokens: 0, // TODO: track from embedder stats
    },
  };

  return run;
}

// ─── Display Helpers ────────────────────────────────────────────────────────

function printRunSummary(run: BenchmarkRun): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Run: ${run.runId}  Label: ${run.label}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Queries: ${run.results.length}`);
  console.log(`  Latency: mean=${run.aggregate.meanLatencyMs.toFixed(0)}ms  p95=${run.aggregate.p95LatencyMs.toFixed(0)}ms`);
  console.log(`  Embedding calls: ${run.aggregate.embeddingCalls}\n`);

  console.log('  K     Precision  Recall    NDCG      MRR');
  console.log('  ' + '─'.repeat(50));
  for (const m of run.aggregate.perK) {
    console.log(
      `  ${String(m.k).padEnd(6)}${m.precision.toFixed(3).padEnd(11)}${m.recall.toFixed(3).padEnd(10)}${m.ndcg.toFixed(3).padEnd(10)}${m.mrr.toFixed(3)}`,
    );
  }
  console.log();
}

function printComparison(baseline: BenchmarkRun, current: BenchmarkRun): void {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  Comparison: ${baseline.label} vs ${current.label}`);
  console.log(`${'═'.repeat(70)}`);
  console.log('  Metric     K   Baseline   Current    Delta');
  console.log('  ' + '─'.repeat(55));

  for (const bm of baseline.aggregate.perK) {
    const cm = current.aggregate.perK.find((m) => m.k === bm.k);
    if (!cm) continue;

    for (const metric of ['precision', 'recall', 'ndcg', 'mrr'] as const) {
      const delta = cm[metric] - bm[metric];
      const sign = delta >= 0 ? '+' : '';
      const flag = delta < -0.05 ? ' !!!' : '';
      console.log(
        `  ${metric.padEnd(11)}${String(bm.k).padEnd(4)}${bm[metric].toFixed(3).padEnd(11)}${cm[metric].toFixed(3).padEnd(11)}${sign}${delta.toFixed(3)}${flag}`,
      );
    }
  }

  const latDelta = current.aggregate.p95LatencyMs - baseline.aggregate.p95LatencyMs;
  console.log(
    `  ${'latency_p95'.padEnd(11)}${''.padEnd(4)}${baseline.aggregate.p95LatencyMs.toFixed(0).padEnd(11)}${current.aggregate.p95LatencyMs.toFixed(0).padEnd(11)}${latDelta >= 0 ? '+' : ''}${latDelta.toFixed(0)}ms`,
  );
  console.log();
}

// ─── Sweep Mode ─────────────────────────────────────────────────────────────

async function runSweep(
  param: SweepParam,
  queries: import('./types.js').RelevanceJudgment[],
): Promise<void> {
  const values = SWEEP_RANGES[param];
  console.log(`\n  Sweeping ${param}: [${values.join(', ')}]\n`);

  const sweepResults: Array<{ label: string; aggregate: BenchmarkRun['aggregate'] }> = [];

  for (const value of values) {
    const config: EvalConfig = {
      ragConfigOverrides: {},
      evalAtK: [5, 10, 20],
      label: `${param}=${value}`,
    };

    // Apply the sweep parameter
    switch (param) {
      case 'rrf-k':
        config.rrfK = value;
        break;
      case 'pool-size':
        config.searchPoolSize = value;
        break;
      case 'chunk-size':
        config.ragConfigOverrides.maxChunkTokens = value;
        break;
      case 'overlap':
        config.ragConfigOverrides.chunkOverlapTokens = value;
        break;
    }

    // For chunk-size and overlap sweeps, we need to re-index
    if (param === 'chunk-size' || param === 'overlap') {
      console.log(`  Re-indexing with ${param}=${value}...`);
      const ragConfig = { ...DEFAULT_RAG_CONFIG, ...config.ragConfigOverrides };
      const indexer = new RAGIndexer(ragConfig);
      await indexer.init();
      await indexer.index();
    }

    const run = await evaluateConfig(config, queries);
    saveRun(run);
    printRunSummary(run);

    sweepResults.push({ label: run.label, aggregate: run.aggregate });
  }

  saveSweepSummary(param, sweepResults);

  // Print sweep comparison table
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  Sweep Results: ${param}`);
  console.log(`${'═'.repeat(70)}`);

  const header = ['Metric/K', ...values.map((v) => `${param}=${v}`)];
  console.log('  ' + header.map((h) => String(h).padEnd(14)).join(''));
  console.log('  ' + '─'.repeat(14 * header.length));

  for (const k of [5, 10, 20]) {
    for (const metric of ['ndcg', 'precision', 'recall', 'mrr'] as const) {
      const row = [`${metric}@${k}`, ...sweepResults.map((sr) => {
        const m = sr.aggregate.perK.find((p) => p.k === k);
        return m ? m[metric].toFixed(3) : 'N/A';
      })];
      console.log('  ' + row.map((c) => String(c).padEnd(14)).join(''));
    }
  }

  const latRow = ['latency_p95', ...sweepResults.map((sr) => `${sr.aggregate.p95LatencyMs.toFixed(0)}ms`)];
  console.log('  ' + latRow.map((c) => String(c).padEnd(14)).join(''));
  console.log();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('\n  RAG Retrieval Quality Benchmark');
  console.log('  ' + '═'.repeat(40));

  const queries = loadGoldenQueries(undefined, args.category);

  if (args.sweep) {
    await runSweep(args.sweep, queries);
    return;
  }

  // Single run mode
  const config: EvalConfig = {
    ragConfigOverrides: {},
    evalAtK: [5, 10, 20],
    label: args.label ?? (args.baseline ? 'baseline' : 'run'),
  };

  // Index if not skipped
  if (!args.skipIndex) {
    console.log('  Ensuring index is up-to-date...');
    const indexer = new RAGIndexer(DEFAULT_RAG_CONFIG);
    await indexer.init();
    const indexResult = await indexer.index();
    console.log(`  Indexed: ${indexResult.filesProcessed} files, ${indexResult.chunksCreated} chunks\n`);
  }

  const run = await evaluateConfig(config, queries);
  saveRun(run);
  printRunSummary(run);

  if (args.baseline) {
    saveBaseline(run);
    console.log('  Saved as baseline-v1\n');
  }

  if (args.compareRunId) {
    try {
      const baseline = loadBaseline();
      printComparison(baseline, run);
    } catch {
      console.log(`  No baseline found for comparison. Run with --baseline first.\n`);
    }
  }
}

main().catch((err) => {
  console.error('\n  Benchmark failed:', err);
  process.exit(1);
});
