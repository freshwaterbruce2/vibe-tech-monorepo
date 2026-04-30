export type UnifiedSource = 'semantic' | 'episodic' | 'procedural' | 'rag' | 'learning';

export interface UnifiedSearchOptions {
  limit?: number;
  sources?: UnifiedSource[];
  timeRange?: { start: number; end: number };
  category?: string;
  /** Multiply each per-source score by 2^(-ageMs/halfLife) before RRF ranking. Default: true */
  recencyBoost?: boolean;
  /**
   * Soft cap on total tokens across all sources before RRF merge.
   * When set, each source is allocated tokenBudget * (weight / total weight)
   * tokens; results are taken in score order until the source budget is hit.
   * Token count uses ~4 chars/token approximation. Omit to disable.
   */
  tokenBudget?: number;
  /**
   * Per-source weight for tokenBudget allocation. Sources not listed get 1.
   * Example: { semantic: 3, episodic: 2, rag: 4, learning: 1 } gives RAG the
   * largest slice. Ignored if tokenBudget is unset.
   */
  sourceWeights?: Partial<Record<UnifiedSource, number>>;
}

export interface UnifiedSearchResult {
  text: string;
  score: number;
  source: UnifiedSource;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}
