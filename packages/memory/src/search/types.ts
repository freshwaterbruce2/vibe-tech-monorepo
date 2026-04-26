export type UnifiedSource = 'semantic' | 'episodic' | 'procedural' | 'rag' | 'learning';

export interface UnifiedSearchOptions {
  limit?: number;
  sources?: UnifiedSource[];
  timeRange?: { start: number; end: number };
  category?: string;
  /** Multiply each per-source score by 2^(-ageMs/halfLife) before RRF ranking. Default: true */
  recencyBoost?: boolean;
}

export interface UnifiedSearchResult {
  text: string;
  score: number;
  source: UnifiedSource;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}
