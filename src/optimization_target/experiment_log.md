# Autoresearch Experiment Log

**Experiment Started:** 2026-03-14
**Objective:** Minimize `Execution_Latency_MS`

## Baseline

- `alpha`: 0.7
- `k`: 100
- `rerank_k`: 100
- `chunk_size`: 512
- `chunk_overlap`: 128
- `fts_boost`: 1.5
- `cache_ttl`: 300
- `Execution_Latency_MS`: 326

## Experiments

<!-- Agent appends entries below -->

## Experiment 1
**Date:** 2026-03-14 14:00:00
**Hypothesis:** Reducing `rerank_k` from 100 to 75 should reduce `Execution_Latency_MS` by lowering reranking work, while keeping all constraints valid.
**Changes Made:** `rerank_k: 100 → 75`
**Resulting Metric:** `Execution_Latency_MS`: 294 (baseline: 326)
**Outcome:** Kept
**Learning:** Focused reductions to `rerank_k` deliver immediate latency gains; next iterations should test smaller decreases and compensate with alpha adjustments if needed.

## Experiment 2
**Date:** 2026-03-14 14:45:12
**Hypothesis:** Lowering `rerank_k` further to 60 should continue reducing reranking overhead without violating the `rerank_k <= k` constraint.
**Changes Made:** `rerank_k: 75 → 60`
**Resulting Metric:** `Execution_Latency_MS`: 280 (previous: 292)
**Outcome:** Kept
**Learning:** The metric responds strongly to `rerank_k` and still improves at this lower value; remaining gains likely still exist by continuing to reduce rerank effort.

## Experiment 3
**Date:** 2026-03-14 14:46:55
**Hypothesis:** `rerank_k` likely dominates latency, so reducing it to 40 should further cut reranking work with no validation impact expected from current constraints.
**Changes Made:** `rerank_k: 60 → 40`
**Resulting Metric:** `Execution_Latency_MS`: 261 (previous: 280)
**Outcome:** Kept
**Learning:** Reranking remains the dominant cost center; diminishing returns still far from exhausted, so this path is still promising.

## Experiment 4
**Date:** 2026-03-14 14:47:42
**Hypothesis:** Larger chunk windows should reduce chunk processing latency because chunk latency scales as `(2048 - chunk_size) * 0.03`.
**Changes Made:** `chunk_size: 512 → 1024`
**Resulting Metric:** `Execution_Latency_MS`: 253 (previous: 261)
**Outcome:** Kept
**Learning:** Chunking cost decreases materially with larger chunk windows; this remains a strong remaining lever.

## Experiment 5
**Date:** 2026-03-14 14:48:58
**Hypothesis:** Removing chunk overlap should reduce overlap-related latency with no structural validation violations.
**Changes Made:** `chunk_overlap: 128 → 0`
**Resulting Metric:** `Execution_Latency_MS`: 242 (previous: 253)
**Outcome:** Kept
**Learning:** Overlap is a meaningful chunk-level cost; reducing it lowers runtime substantially in this benchmark.

## Experiment 6
**Date:** 2026-03-14 14:52:02
**Hypothesis:** Raising `k` from 100 to 200 should reduce the `rerank_k <= k` pressure and might lower tail penalty.
**Changes Made:** `k: 100 → 200`
**Resulting Metric:** `Execution_Latency_MS`: 291 (reverted from 242)
**Outcome:** Reverted
**Learning:** For this simulator, vector search term grows with `k` enough to dominate; larger `k` is counterproductive despite lower rerank constraint pressure.


