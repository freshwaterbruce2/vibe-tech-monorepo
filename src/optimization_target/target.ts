/**
 * Optimization target for autonomous latency experiments.
 *
 * This file is the ONLY one the agent is allowed to modify.
 */

export interface TargetParams {
  alpha: number;
  k: number;
  rerank_k: number;
  chunk_size: number;
  chunk_overlap: number;
  fts_boost: number;
  cache_ttl: number;
}

export const TARGET_PARAMS: TargetParams = {
  alpha: 0.7,
  k: 100,
  rerank_k: 40,
  chunk_size: 1024,
  chunk_overlap: 0,
  fts_boost: 1,
  cache_ttl: 300,
};

export function validateParams(params: TargetParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.alpha < 0 || params.alpha > 1) {
    errors.push(`alpha must be in range [0, 1], got ${params.alpha}`);
  }

  if (params.k < 10 || params.k > 500) {
    errors.push(`k must be in range [10, 500], got ${params.k}`);
  }

  if (params.rerank_k < 10 || params.rerank_k > 200) {
    errors.push(`rerank_k must be in range [10, 200], got ${params.rerank_k}`);
  }

  if (params.rerank_k > params.k) {
    errors.push(`rerank_k (${params.rerank_k}) cannot exceed k (${params.k})`);
  }

  if (params.chunk_size < 256 || params.chunk_size > 2048) {
    errors.push(`chunk_size must be in range [256, 2048], got ${params.chunk_size}`);
  }

  if (params.chunk_overlap < 0 || params.chunk_overlap > params.chunk_size / 2) {
    errors.push(`chunk_overlap must be in range [0, ${params.chunk_size / 2}], got ${params.chunk_overlap}`);
  }

  if (params.fts_boost < 1 || params.fts_boost > 3) {
    errors.push(`fts_boost must be in range [1, 3], got ${params.fts_boost}`);
  }

  if (params.cache_ttl < 0 || params.cache_ttl > 3600) {
    errors.push(`cache_ttl must be in range [0, 3600], got ${params.cache_ttl}`);
  }

  return { valid: errors.length === 0, errors };
}
