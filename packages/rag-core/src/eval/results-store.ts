/**
 * Results Store
 * Persists benchmark runs to D:\nova-agent-data\eval\ and loads them for comparison.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';
import type { BenchmarkRun } from './types.js';

const EVAL_ROOT = 'D:\\nova-agent-data\\eval';
const RUNS_DIR = join(EVAL_ROOT, 'runs');
const BASELINES_DIR = join(EVAL_ROOT, 'baselines');
const SUMMARIES_DIR = join(EVAL_ROOT, 'summaries');

function ensureDirs(): void {
  for (const dir of [EVAL_ROOT, RUNS_DIR, BASELINES_DIR, SUMMARIES_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function generateRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function saveRun(run: BenchmarkRun): string {
  ensureDirs();
  const filePath = join(RUNS_DIR, `${run.runId}.json`);
  writeFileSync(filePath, JSON.stringify(run, null, 2), 'utf-8');
  console.log(`[ResultsStore] Saved run to ${filePath}`);
  return filePath;
}

export function loadRun(runId: string): BenchmarkRun {
  const filePath = join(RUNS_DIR, `${runId}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Run not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function listRuns(): Array<{ runId: string; label: string; timestamp: number }> {
  ensureDirs();
  const files = readdirSync(RUNS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const run: BenchmarkRun = JSON.parse(readFileSync(join(RUNS_DIR, f), 'utf-8'));
    return { runId: run.runId, label: run.label, timestamp: run.timestamp };
  }).sort((a, b) => b.timestamp - a.timestamp);
}

export function saveBaseline(run: BenchmarkRun, name: string = 'baseline-v1'): string {
  ensureDirs();
  const runPath = join(RUNS_DIR, `${run.runId}.json`);
  const baselinePath = join(BASELINES_DIR, `${name}.json`);

  // Ensure run is saved first
  if (!existsSync(runPath)) {
    saveRun(run);
  }
  copyFileSync(runPath, baselinePath);
  console.log(`[ResultsStore] Saved baseline to ${baselinePath}`);
  return baselinePath;
}

export function loadBaseline(name: string = 'baseline-v1'): BenchmarkRun {
  const filePath = join(BASELINES_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Baseline not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function saveSweepSummary(
  param: string,
  results: Array<{ label: string; aggregate: BenchmarkRun['aggregate'] }>,
): string {
  ensureDirs();
  const filePath = join(SUMMARIES_DIR, `sweep-${param}.json`);
  writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[ResultsStore] Saved sweep summary to ${filePath}`);
  return filePath;
}
