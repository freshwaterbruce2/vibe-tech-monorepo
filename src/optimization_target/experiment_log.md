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


