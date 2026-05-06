export interface MemoryStoreStats {
  store: 'episodic' | 'semantic' | 'procedural';
  recordCount: number;
  avgEmbeddingDim?: number;
}

export interface EpisodicMemoryItem {
  id: number;
  sourceId: string;
  timestamp: number;
  query: string;
  response: string;
  sessionId?: string;
}

export interface SemanticMemoryItem {
  id: number;
  text: string;
  category?: string;
  importance: number;
  created: number;
  lastAccessed?: number;
  accessCount: number;
}

export interface ProceduralMemoryItem {
  id: number;
  pattern: string;
  context: string;
  frequency: number;
  successRate: number;
  lastUsed?: number;
}

export interface DecayScoreItem {
  memoryId: number;
  textPreview: string;
  decayScore: number;
  recommendedAction: 'keep' | 'summarize' | 'prune';
  ageMs: number;
  accessCount: number;
  importance: number;
  category: string | null;
}

export interface MemorySnapshot {
  stats: MemoryStoreStats[];
  recentEpisodic: EpisodicMemoryItem[];
  recentSemantic: SemanticMemoryItem[];
  recentProcedural: ProceduralMemoryItem[];
  decayItems: DecayScoreItem[];
  consolidationStatus: {
    lastRunAt: number | null;
    itemsSummarized: number;
    itemsPruned: number;
  };
  generatedAt: number;
}

export interface MemorySearchResultItem {
  source: 'episodic' | 'semantic' | 'procedural';
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ConsolidationResult {
  success: boolean;
  message: string;
}
