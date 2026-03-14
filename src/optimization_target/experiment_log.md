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

## Experiment 7
**Date:** 2026-03-14 14:53:15
**Hypothesis:** Lowering `fts_boost` to the minimum reduces full-text scoring overhead with no direct validity penalties.
**Changes Made:** `fts_boost: 1.5 → 1`
**Resulting Metric:** `Execution_Latency_MS`: 236 (previous: 242)
**Outcome:** Kept
**Learning:** Full-text boost contributes linearly to latency in this harness; the minimum setting is materially faster.

## Experiment 8
**Date:** 2026-03-14 14:54:03
**Hypothesis:** Reducing `alpha` to 0 should reduce alpha blending overhead and lower latency further.
**Changes Made:** `alpha: 0.7 → 0`
**Resulting Metric:** `Execution_Latency_MS`: 259 (reverted to 236)
**Outcome:** Reverted
**Learning:** In this setup, lowering `alpha` this far increased observed latency, likely due interaction noise or non-linear blending effects in the harness.

## Experiment 9
**Date:** 2026-03-14 14:55:24
**Hypothesis:** `rerank_k` still appears to be the largest remaining latency contributor, so halving it again from 40 to 20 should cut reranking cost further.
**Changes Made:** `rerank_k: 40 → 20`
**Resulting Metric:** `Execution_Latency_MS`: 225 (previous: 236)
**Outcome:** Kept
**Learning:** Reranking remains the primary driver of latency, and lower `rerank_k` values continue to pay off in this benchmark.

## Experiment 10
**Date:** 2026-03-14 14:56:05
**Hypothesis:** Continuing the `rerank_k` reduction path to 10 should continue reducing rerank overhead until the lower constraint bound.
**Changes Made:** `rerank_k: 20 → 10`
**Resulting Metric:** `Execution_Latency_MS`: 215 (previous: 225)
**Outcome:** Kept
**Learning:** The lower bound for rerank work is still reachable and yields clear gains in this environment.

## Experiment 11
**Date:** 2026-03-14 14:56:42
**Hypothesis:** With rerank now at minimum, lowering `k` to 10 should reduce vector work enough to dominate the next wins.
**Changes Made:** `k: 100 → 10`
**Resulting Metric:** `Execution_Latency_MS`: 169 (previous: 215)
**Outcome:** Kept
**Learning:** Vector scoring term dominates more than expected once rerank work is small; `k` is a stronger lever than initial intuition suggested.

## Experiment 12
**Date:** 2026-03-14 14:57:18
**Hypothesis:** `chunk_size` still has residual overhead at 1024, so moving to the maximum should remove remaining chunk processing cost.
**Changes Made:** `chunk_size: 1024 → 2048`
**Resulting Metric:** `Execution_Latency_MS`: 133 (previous: 169)
**Outcome:** Kept
**Learning:** Chunk window size was still materially expensive at 1024; maxing it out gives a strong latency win in this harness.


