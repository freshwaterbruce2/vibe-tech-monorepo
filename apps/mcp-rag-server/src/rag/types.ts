/**
 * RAG Pipeline Types
 * Core interfaces for the LanceDB-backed retrieval-augmented generation system.
 */

export type ChunkType = 'function' | 'component' | 'class' | 'method' | 'export' | 'module' | 'text';

export interface Chunk {
  id: string;
  filePath: string;
  content: string;
  type: ChunkType;
  startLine: number;
  endLine: number;
  symbolName?: string;
  imports?: string[];
  parentId?: string;
  language: 'typescript' | 'javascript' | 'python' | 'markdown' | 'json' | 'other';
  tokenCount: number;
  createdAt: number;
  /**
   * Optional Anthropic-style contextual prefix (50-100 tokens) that situates
   * this chunk within its source document. Prepended to embedding input only;
   * `content` remains the raw source for display/snippet purposes.
   * See: https://www.anthropic.com/news/contextual-retrieval
   */
  contextPrefix?: string;
  /** True when this chunk was processed with contextual chunking. */
  contextual?: boolean;
}

export interface EmbeddingResult {
  vector: number[];
  dimension: number;
  model: string;
  durationMs: number;
}

export interface EmbeddingBatchResult {
  results: EmbeddingResult[];
  totalDurationMs: number;
  failedIndices: number[];
}

export interface SearchQuery {
  text: string;
  limit?: number;
  fileTypes?: string[];
  pathPrefix?: string;
  chunkTypes?: ChunkType[];
  minScore?: number;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
  vectorScore: number;
  ftsScore: number;
  source: 'vector' | 'fts' | 'hybrid';
}

export interface IndexState {
  totalFiles: number;
  totalChunks: number;
  lastFullIndex: number | null;
  lastIncrementalIndex: number | null;
  pendingFiles: number;
  isRunning: boolean;
}

export interface FileHash {
  filePath: string;
  hash: string;
  lastIndexed: number;
  chunkCount: number;
}

export interface IndexResult {
  filesProcessed: number;
  chunksCreated: number;
  chunksRemoved: number;
  durationMs: number;
  errors: Array<{ filePath: string; error: string }>;
}

export interface CacheEntry {
  key: string;
  results: SearchResult[];
  createdAt: number;
  ttlMs: number;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number | null;
  totalSizeBytes: number;
}

export interface RerankCandidate {
  chunk: Chunk;
  vectorRank: number;
  ftsRank: number;
  vectorScore: number;
  ftsScore: number;
}

export interface RerankResult {
  results: SearchResult[];
  method: 'rrf' | 'cross-encoder' | 'rrf+cross-encoder';
  durationMs: number;
}

export interface DatabaseSchema {
  tableName: string;
  columns: Array<{ name: string; type: string; nullable: boolean; primaryKey: boolean }>;
  rowCount: number;
}

export interface ConnectorQuery {
  question: string;
  sql?: string;
  results?: Record<string, unknown>[];
  error?: string;
}

export interface RAGConfig {
  lanceDbPath: string;
  cachePath: string;
  hashIndexPath: string;
  logPath: string;
  workspaceRoot: string;
  embeddingEndpoint: string;
  embeddingModel: string;
  maxChunkTokens: number;
  chunkOverlapTokens: number;
  cacheTtlMs: number;
  autoIndexIntervalMs: number;
  indexPaths: string[];
  excludePatterns: string[];
  searchPoolSize: number;
  hydeEnabled: boolean;
  hydeModel: string;
  /** Opt-in Anthropic-style contextual chunking. Requires full re-index to take effect. */
  contextualChunkingEnabled: boolean;
  contextualChunkingModel: string;
  contextualChunkingMaxTokens: number;
  contextualChunkingMaxDocumentBytes: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  lanceDbPath: 'D:\\nova-agent-data\\lance-db',
  cachePath: 'D:\\nova-agent-data\\cache\\query-cache.sqlite',
  hashIndexPath: 'D:\\nova-agent-data\\indexes\\file-hashes.json',
  logPath: 'D:\\nova-agent-data\\logs\\rag-operations.log',
  workspaceRoot: 'C:\\dev',
  embeddingEndpoint: 'http://localhost:3001',
  embeddingModel: 'text-embedding-3-small',
  maxChunkTokens: 512,
  chunkOverlapTokens: 64,
  cacheTtlMs: 60 * 60 * 1000,
  autoIndexIntervalMs: 15 * 60 * 1000,
  indexPaths: ['apps/', 'packages/', 'backend/'],
  excludePatterns: [
    '**/node_modules/**', '**/dist/**', '**/.nx/**', '**/coverage/**',
    '**/*.test.ts', '**/*.spec.ts', '**/target/**', '**/.git/**',
  ],
  searchPoolSize: 50,
  hydeEnabled: false,
  hydeModel: 'openai/gpt-4o-mini',
  contextualChunkingEnabled: false,
  // claude-3-haiku retired 2026-04-19; Haiku 4.5 is current cheapest with cache.
  contextualChunkingModel: 'anthropic/claude-haiku-4.5',
  contextualChunkingMaxTokens: 120,
  contextualChunkingMaxDocumentBytes: 60_000,
};
