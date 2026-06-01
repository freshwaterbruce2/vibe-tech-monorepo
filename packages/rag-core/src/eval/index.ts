/**
 * RAG Evaluation Framework
 * Barrel exports for programmatic use.
 */

export type {
  RelevanceJudgment,
  GoldenQuerySet,
  QueryCategory,
  EvalConfig,
  MetricResult,
  QueryEvalResult,
  BenchmarkRun,
  AggregateMetrics,
  RegressionThresholds,
  RegressionResult,
  RegressionCheck,
  SweepParam,
  SweepConfig,
} from './types.js';

export { DEFAULT_REGRESSION_THRESHOLDS, SWEEP_RANGES } from './types.js';
export { precisionAtK, recallAtK, ndcgAtK, mrr, computeAllMetrics, aggregateMetrics, p95Latency } from './metrics.js';
export { loadGoldenQueries } from './golden-queries-loader.js';
export { generateRunId, saveRun, loadRun, listRuns, saveBaseline, loadBaseline, saveSweepSummary } from './results-store.js';
export { checkRegression } from './regression.js';
