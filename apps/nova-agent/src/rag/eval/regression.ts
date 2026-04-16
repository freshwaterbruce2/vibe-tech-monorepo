/**
 * Regression Checker
 * Compares a benchmark run against baseline and fails if quality drops below thresholds.
 *
 * Usage:
 *   pnpm --filter nova-agent exec tsx src/rag/eval/regression.ts [--baseline <name>] [--run <runId>]
 *
 * Exit code 0 = passed, 1 = regression detected.
 */

import { loadBaseline, loadRun, listRuns } from './results-store.js';
import type { BenchmarkRun, RegressionCheck, RegressionResult, RegressionThresholds } from './types.js';
import { DEFAULT_REGRESSION_THRESHOLDS } from './types.js';

export function checkRegression(
  baseline: BenchmarkRun,
  current: BenchmarkRun,
  thresholds: RegressionThresholds = DEFAULT_REGRESSION_THRESHOLDS,
): RegressionCheck {
  const regressions: RegressionResult[] = [];

  // Check metrics at key K values
  const checks: Array<{ metric: 'ndcg' | 'precision' | 'recall' | 'mrr'; k: number; threshold: number }> = [
    { metric: 'ndcg', k: 5, threshold: thresholds.ndcg5 },
    { metric: 'precision', k: 5, threshold: thresholds.precision5 },
    { metric: 'mrr', k: 5, threshold: thresholds.mrr },
    { metric: 'recall', k: 10, threshold: thresholds.recall10 },
  ];

  for (const { metric, k, threshold } of checks) {
    const bm = baseline.aggregate.perK.find((m) => m.k === k);
    const cm = current.aggregate.perK.find((m) => m.k === k);

    if (!bm || !cm) continue;

    const delta = cm[metric] - bm[metric];
    regressions.push({
      metric,
      k,
      baseline: bm[metric],
      current: cm[metric],
      delta,
      threshold,
      passed: delta >= -threshold,
    });
  }

  // Check latency
  const latDelta = current.aggregate.p95LatencyMs - baseline.aggregate.p95LatencyMs;
  regressions.push({
    metric: 'latency_p95',
    k: 0,
    baseline: baseline.aggregate.p95LatencyMs,
    current: current.aggregate.p95LatencyMs,
    delta: latDelta,
    threshold: thresholds.latencyP95Ms,
    passed: latDelta <= thresholds.latencyP95Ms,
  });

  return {
    baselineRunId: baseline.runId,
    currentRunId: current.runId,
    regressions,
    overallPassed: regressions.every((r) => r.passed),
  };
}

function printRegressionReport(check: RegressionCheck): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Regression Check: ${check.baselineRunId} -> ${check.currentRunId}`);
  console.log(`${'═'.repeat(60)}`);
  console.log('  Metric          K    Baseline  Current   Delta     Status');
  console.log('  ' + '─'.repeat(55));

  for (const r of check.regressions) {
    const status = r.passed ? 'PASS' : 'FAIL';
    const kStr = r.k > 0 ? String(r.k) : '-';
    const sign = r.delta >= 0 ? '+' : '';
    console.log(
      `  ${r.metric.padEnd(18)}${kStr.padEnd(5)}${r.baseline.toFixed(3).padEnd(10)}${r.current.toFixed(3).padEnd(10)}${(sign + r.delta.toFixed(3)).padEnd(10)}${status}`,
    );
  }

  console.log();
  console.log(`  Overall: ${check.overallPassed ? 'PASSED' : 'FAILED'}`);
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let baselineName = 'baseline-v1';
  let runId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline') baselineName = args[++i] ?? baselineName;
    if (args[i] === '--run') runId = args[++i];
  }

  const baseline = loadBaseline(baselineName);

  let current: BenchmarkRun;
  if (runId) {
    current = loadRun(runId);
  } else {
    // Use most recent run
    const runs = listRuns();
    if (runs.length === 0) {
      console.error('No runs found. Run benchmark-runner first.');
      process.exit(1);
    }
    current = loadRun(runs[0]?.runId ?? '');
  }

  const check = checkRegression(baseline, current);
  printRegressionReport(check);

  process.exit(check.overallPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Regression check failed:', err);
  process.exit(1);
});
