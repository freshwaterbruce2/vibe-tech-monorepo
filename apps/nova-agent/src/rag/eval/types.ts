/**
 * RAG Evaluation Types
 * Interfaces for benchmarking retrieval quality, parameter sweeps, and regression testing.
 */

import type { RAGConfig } from '../types.js';

// ─── Golden Query Set ───────────────────────────────────────────────────────

export type QueryCategory = 'code-nav' | 'concept' | 'pattern' | 'docs';

export interface RelevanceJudgment {
  /** Unique query identifier (e.g., "cn-001") */
  queryId: string;
  /** Natural language query text */
  queryText: string;
  /** Query category */
  category: QueryCategory;
  /** File path -> relevance grade (0=irrelevant, 1=marginal, 2=relevant, 3=highly-relevant) */
  relevantDocs: Record<string, 0 | 1 | 2 | 3>;
  /** Expected top-1 result file path (for MRR sanity checking) */
  expectedTopResult?: string;
}

export interface GoldenQuerySet {
  version: number;
  created: string;
  queries: RelevanceJudgment[];
}

// ─── Evaluation Configuration ───────────────────────────────────────────────

export interface EvalConfig {
  /** Partial RAGConfig overrides (chunk size, overlap, etc.) */
  ragConfigOverrides: Partial<RAGConfig>;
  /** RRF K constant override */
  rrfK?: number;
  /** Search pool size override */
  searchPoolSize?: number;
  /** K values to evaluate metrics at */
  evalAtK: number[];
  /** Human-readable label for this config (e.g., "chunk512-rrfK40") */
  label: string;
}

// ─── Metric Results ─────────────────────────────────────────────────────────

export interface MetricResult {
  k: number;
  precision: number;
  recall: number;
  ndcg: number;
  mrr: number;
}

export interface QueryEvalResult {
  queryId: string;
  queryText: string;
  category: QueryCategory;
  /** Metrics computed at each K */
  metrics: MetricResult[];
  /** Search latency in ms (cache disabled) */
  latencyMs: number;
  /** File paths returned by the pipeline (ordered by rank) */
  resultFilePaths: string[];
  /** Scores from the pipeline (same order as resultFilePaths) */
  resultScores: number[];
}

// ─── Benchmark Run ──────────────────────────────────────────────────────────

export interface BenchmarkRun {
  /** ISO timestamp run ID (e.g., "2026-03-18T14-30-00") */
  runId: string;
  /** Human-readable label */
  label: string;
  /** Configuration used for this run */
  config: EvalConfig;
  /** Timestamp (epoch ms) */
  timestamp: number;
  /** Per-query results */
  results: QueryEvalResult[];
  /** Aggregate metrics */
  aggregate: AggregateMetrics;
}

export interface AggregateMetrics {
  /** Metrics averaged across all queries, per K */
  perK: MetricResult[];
  /** Mean latency (ms) */
  meanLatencyMs: number;
  /** 95th percentile latency (ms) */
  p95LatencyMs: number;
  /** Total embedding API calls made */
  embeddingCalls: number;
  /** Total embedding tokens consumed */
  embeddingTokens: number;
}

// ─── Regression Testing ─────────────────────────────────────────────────────

export interface RegressionThresholds {
  /** Max allowed NDCG@5 regression (positive = allowed drop, e.g., 0.05) */
  ndcg5: number;
  /** Max allowed Precision@5 regression */
  precision5: number;
  /** Max allowed MRR regression */
  mrr: number;
  /** Max allowed Recall@10 regression */
  recall10: number;
  /** Max allowed latency p95 increase in ms */
  latencyP95Ms: number;
}

export const DEFAULT_REGRESSION_THRESHOLDS: RegressionThresholds = {
  ndcg5: 0.05,
  precision5: 0.05,
  mrr: 0.05,
  recall10: 0.08,
  latencyP95Ms: 50,
};

export interface RegressionResult {
  metric: string;
  k: number;
  baseline: number;
  current: number;
  delta: number;
  threshold: number;
  passed: boolean;
}

export interface RegressionCheck {
  baselineRunId: string;
  currentRunId: string;
  regressions: RegressionResult[];
  overallPassed: boolean;
}

// ─── Sweep Configuration ────────────────────────────────────────────────────

export type SweepParam = 'rrf-k' | 'pool-size' | 'chunk-size' | 'overlap';

export interface SweepConfig {
  param: SweepParam;
  values: number[];
  /** Base config to apply overrides on top of */
  baseConfig: EvalConfig;
}

export const SWEEP_RANGES: Record<SweepParam, number[]> = {
  'rrf-k': [10, 20, 40, 60, 80, 100],
  'pool-size': [10, 20, 40, 60],
  'chunk-size': [256, 384, 512, 768, 1024],
  'overlap': [0, 32, 64, 128],
};
