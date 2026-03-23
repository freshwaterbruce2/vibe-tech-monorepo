/**
 * IR Evaluation Metrics
 * Pure functions for computing Precision, Recall, NDCG, and MRR.
 */

import type { MetricResult, RelevanceJudgment } from './types.js';

/** Minimum relevance grade to count as "relevant" for binary metrics (P/R/MRR) */
const RELEVANCE_THRESHOLD = 2;

/**
 * Precision@K: fraction of top-K results that are relevant.
 */
export function precisionAtK(
  retrieved: string[],
  relevant: Set<string>,
  k: number,
): number {
  const topK = retrieved.slice(0, k);
  if (topK.length === 0) return 0;
  const hits = topK.filter((fp) => relevant.has(fp)).length;
  return hits / topK.length;
}

/**
 * Recall@K: fraction of all relevant documents found in top-K.
 */
export function recallAtK(
  retrieved: string[],
  relevant: Set<string>,
  k: number,
): number {
  if (relevant.size === 0) return 1; // No relevant docs = perfect recall by convention
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((fp) => relevant.has(fp)).length;
  return hits / relevant.size;
}

/**
 * NDCG@K: Normalized Discounted Cumulative Gain using graded relevance (0-3).
 */
export function ndcgAtK(
  retrieved: string[],
  relevanceGrades: Record<string, number>,
  k: number,
): number {
  const topK = retrieved.slice(0, k);

  // DCG: sum of (2^rel - 1) / log2(rank + 1)
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    const rel = relevanceGrades[topK[i]!] ?? 0;
    dcg += (Math.pow(2, rel) - 1) / Math.log2(i + 2); // i+2 because rank is 1-based
  }

  // Ideal DCG: sort all grades descending, compute DCG
  const idealGrades = Object.values(relevanceGrades)
    .filter((g) => g > 0)
    .sort((a, b) => b - a)
    .slice(0, k);

  let idcg = 0;
  for (let i = 0; i < idealGrades.length; i++) {
    idcg += (Math.pow(2, idealGrades[i]!) - 1) / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * MRR: Mean Reciprocal Rank — reciprocal of the rank of the first relevant result.
 */
export function mrr(retrieved: string[], relevant: Set<string>): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.has(retrieved[i]!)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Compute all metrics at specified K values for a single query.
 */
export function computeAllMetrics(
  retrieved: string[],
  judgment: RelevanceJudgment,
  atK: number[],
): MetricResult[] {
  // Build binary relevant set (grade >= threshold)
  const relevant = new Set<string>();
  for (const [fp, grade] of Object.entries(judgment.relevantDocs)) {
    if (grade >= RELEVANCE_THRESHOLD) {
      relevant.add(fp);
    }
  }

  return atK.map((k) => ({
    k,
    precision: precisionAtK(retrieved, relevant, k),
    recall: recallAtK(retrieved, relevant, k),
    ndcg: ndcgAtK(retrieved, judgment.relevantDocs, k),
    mrr: mrr(retrieved, relevant),
  }));
}

/**
 * Aggregate metric results across multiple queries (mean of each metric per K).
 */
export function aggregateMetrics(allResults: MetricResult[][]): MetricResult[] {
  if (allResults.length === 0) return [];

  // Group by K
  const byK = new Map<number, MetricResult[]>();
  for (const queryMetrics of allResults) {
    for (const m of queryMetrics) {
      const arr = byK.get(m.k) ?? [];
      arr.push(m);
      byK.set(m.k, arr);
    }
  }

  const aggregated: MetricResult[] = [];
  for (const [k, metrics] of byK) {
    const n = metrics.length;
    aggregated.push({
      k,
      precision: metrics.reduce((s, m) => s + m.precision, 0) / n,
      recall: metrics.reduce((s, m) => s + m.recall, 0) / n,
      ndcg: metrics.reduce((s, m) => s + m.ndcg, 0) / n,
      mrr: metrics.reduce((s, m) => s + m.mrr, 0) / n,
    });
  }

  return aggregated.sort((a, b) => a.k - b.k);
}

/**
 * Compute p95 latency from an array of latency values.
 */
export function p95Latency(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}
