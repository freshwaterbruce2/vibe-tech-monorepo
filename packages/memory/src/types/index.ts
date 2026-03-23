// Core configuration
export interface MemoryConfig {
  /** Database path (e.g., D:\databases\memory.db) */
  dbPath: string;
  /** Embedding model name (default: text-embedding-3-small) */
  embeddingModel?: string;
  /** Embedding dimension (default: 1536 for text-embedding-3-small) */
  embeddingDimension?: number;
  /** OpenRouter-compatible embedding endpoint (default: http://localhost:3001) */
  embeddingEndpoint?: string;
  /** Fallback to Transformers.js if OpenRouter unavailable */
  fallbackToTransformers?: boolean;
  /** Log level (default: 'info') */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Consolidation interval in hours (default: 24) */
  consolidationInterval?: number;
}

// Episodic memory (timestamped events)
export interface EpisodicMemory {
  id?: number;
  sourceId: string; // e.g., 'claude-code', 'gemini-cli'
  timestamp: number; // Unix timestamp
  query: string;
  response: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

// Semantic memory (long-term knowledge with embeddings)
export interface SemanticMemory {
  id?: number;
  text: string;
  embedding: number[]; // Vector embedding
  category?: string; // e.g., 'architecture', 'workflow', 'debugging'
  importance: number; // 1-10 scale
  created: number; // Unix timestamp
  lastAccessed?: number;
  accessCount: number;
  metadata?: Record<string, unknown>;
}

// Procedural memory (command patterns, workflows)
export interface ProceduralMemory {
  id?: number;
  pattern: string; // Command/workflow pattern
  context: string; // When to use it
  frequency: number; // How often used
  successRate: number; // 0-1 scale
  lastUsed?: number;
  metadata?: Record<string, unknown>;
}

// Search results with similarity scores
export interface SearchResult<T> {
  item: T;
  score: number; // Cosine similarity (0-1)
  distance: number; // Vector distance
}

// Embedding provider types
export type EmbeddingProvider = 'openrouter' | 'ollama' | 'transformers';

// Database schemas
export interface DatabaseSchema {
  episodic: string;
  semantic: string;
  procedural: string;
  healthMetrics: string;
}
