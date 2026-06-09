/**
 * Run Comparison Utility
 * Side-by-side comparison of multiple benchmark runs.
 *
 * Usage:
 *   pnpm --filter nova-agent exec tsx src/rag/eval/compare.ts <runId1> <runId2> [runId3...]
 */

import { loadRun } from './results-store.js';
import type { BenchmarkRun } from './types.js';

function printComparisonTable(runs: BenchmarkRun[]): void {
  const labels = runs.map((r) => r.label);
  const colWidth = 14;

  console.log(`\n${'═'.repeat(16 + colWidth * labels.length)}`);
  console.log(`  Side-by-Side Comparison (${runs.length} runs)`);
  console.log(`${'═'.repeat(16 + colWidth * labels.length)}`);

  // Header
  console.log('  ' + 'Metric'.padEnd(16) + labels.map((l) => l.padEnd(colWidth)).join(''));
  console.log('  ' + '─'.repeat(16 + colWidth * labels.length));

  // Metrics per K
  const allKValues = [...new Set(runs.flatMap((r) => r.aggregate.perK.map((m) => m.k)))].sort((a, b) => a - b);

  for (const k of allKValues) {
    for (const metric of ['ndcg', 'precision', 'recall', 'mrr'] as const) {
      const label = `${metric}@${k}`;
      const values = runs.map((r) => {
        const m = r.aggregate.perK.find((p) => p.k === k);
        return m ? m[metric].toFixed(3) : 'N/A';
      });
      console.log('  ' + label.padEnd(16) + values.map((v) => v.padEnd(colWidth)).join(''));
    }
    console.log('  ' + '─'.repeat(16 + colWidth * labels.length));
  }

  // Latency
  const latMean = runs.map((r) => `${r.aggregate.meanLatencyMs.toFixed(0)}ms`);
  const latP95 = runs.map((r) => `${r.aggregate.p95LatencyMs.toFixed(0)}ms`);
  console.log('  ' + 'latency_mean'.padEnd(16) + latMean.map((v) => v.padEnd(colWidth)).join(''));
  console.log('  ' + 'latency_p95'.padEnd(16) + latP95.map((v) => v.padEnd(colWidth)).join(''));

  // Embedding cost
  const embCalls = runs.map((r) => String(r.aggregate.embeddingCalls));
  console.log('  ' + 'embed_calls'.padEnd(16) + embCalls.map((v) => v.padEnd(colWidth)).join(''));

  console.log();
}

async function main(): Promise<void> {
  const runIds = process.argv.slice(2);

  if (runIds.length < 2) {
    console.log('Usage: tsx src/rag/eval/compare.ts <runId1> <runId2> [runId3...]');
    process.exit(1);
  }

  const runs = runIds.map((id) => loadRun(id));
  printComparisonTable(runs);
}

main().catch((err) => {
  console.error('Compare failed:', err);
  process.exit(1);
});
