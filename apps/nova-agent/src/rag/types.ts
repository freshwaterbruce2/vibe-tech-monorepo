/**
 * RAG Pipeline Types
 * Core interfaces for the LanceDB-backed retrieval-augmented generation system.
 */

// ─── Chunking ───────────────────────────────────────────────────────────────

export type ChunkType = 'function' | 'component' | 'class' | 'method' | 'export' | 'module' | 'text';

export interface Chunk {
  /** Unique chunk ID (SHA-256 of filePath + content) */
  id: string;
  /** Source file path (relative to workspace root) */
  filePath: string;
  /** Raw text content of the chunk */
  content: string;
  /** Chunk type (AST-derived or text) */
  type: ChunkType;
  /** Start line in source file (1-based) */
  startLine: number;
  /** End line in source file (1-based) */
  endLine: number;
  /** Symbol name (for AST chunks: function/class/component name) */
  symbolName?: string;
  /** Import statements relevant to this chunk */
  imports?: string[];
  /** Parent chunk ID (for nested symbols) */
  parentId?: string;
  /** Language of the source file */
  language: 'typescript' | 'javascript' | 'python' | 'markdown' | 'json' | 'other';
  /** Token count estimate */
  tokenCount: number;
  /** Timestamp when chunk was created */
  createdAt: number;
  /**
   * Optional Anthropic-style contextual prefix (50-100 tokens) that situates
   * this chunk within its source document. When set, it is prepended to the
   * embedding input but kept separate from `content` so display/snippet code
   * still shows the real source.
   * See: https://www.anthropic.com/news/contextual-retrieval
   */
  contextPrefix?: string;
  /** True when this chunk was processed with contextual chunking (prefix generated). */
  contextual?: boolean;
}

// ─── Embeddings ─────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  /** The embedding vector */
  vector: number[];
  /** Dimension of the vector */
  dimension: number;
  /** Model used to generate */
  model: string;
  /** Time taken in ms */
  durationMs: number;
}

export interface EmbeddingBatchResult {
  results: EmbeddingResult[];
  totalDurationMs: number;
  failedIndices: number[];
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface SearchQuery {
  /** Natural language query */
  text: string;
  /** Maximum results to return */
  limit?: number;
  /** Filter by file type */
  fileTypes?: string[];
  /** Filter by project/directory */
  pathPrefix?: string;
  /** Filter by chunk type */
  chunkTypes?: ChunkType[];
  /** Minimum relevance score (0-1) */
  minScore?: number;
}

export interface SearchResult {
  /** The matched chunk */
  chunk: Chunk;
  /** Combined relevance score (0-1, higher is better) */
  score: number;
  /** Vector similarity score */
  vectorScore: number;
  /** Full-text search score */
  ftsScore: number;
  /** Source of the result */
  source: 'vector' | 'fts' | 'hybrid';
}

// ─── Indexing ───────────────────────────────────────────────────────────────

export interface IndexState {
  /** Total files indexed */
  totalFiles: number;
  /** Total chunks in the index */
  totalChunks: number;
  /** Last full index timestamp */
  lastFullIndex: number | null;
  /** Last incremental index timestamp */
  lastIncrementalIndex: number | null;
  /** Files changed since last index */
  pendingFiles: number;
  /** Index is currently running */
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

// ─── Cache ──────────────────────────────────────────────────────────────────

export interface CacheEntry {
  /** SHA-256 of normalized query */
  key: string;
  /** Serialized search results */
  results: SearchResult[];
  /** When the entry was created */
  createdAt: number;
  /** TTL in milliseconds */
  ttlMs: number;
  /** Number of times this entry was hit */
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

// ─── Reranking ──────────────────────────────────────────────────────────────

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

// ─── Connectors ─────────────────────────────────────────────────────────────

export interface DatabaseSchema {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
  }>;
  rowCount: number;
}

export interface ConnectorQuery {
  /** Natural language question about the data */
  question: string;
  /** Generated SQL (if applicable) */
  sql?: string;
  /** Query results */
  results?: Record<string, unknown>[];
  /** Error if query failed */
  error?: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

export interface RAGConfig {
  /** LanceDB storage directory */
  lanceDbPath: string;
  /** Query cache SQLite path */
  cachePath: string;
  /** File hash index path */
  hashIndexPath: string;
  /** Log file path */
  logPath: string;
  /** Workspace root to index */
  workspaceRoot: string;
  /** Embedding API endpoint */
  embeddingEndpoint: string;
  /** Embedding model name */
  embeddingModel: string;
  /** Maximum chunk size in tokens */
  maxChunkTokens: number;
  /** Chunk overlap in tokens */
  chunkOverlapTokens: number;
  /** Cache TTL in milliseconds */
  cacheTtlMs: number;
  /** Auto-index interval in milliseconds (0 = disabled) */
  autoIndexIntervalMs: number;
  /** Directories to index (relative to workspace root) */
  indexPaths: string[];
  /** Glob patterns to exclude */
  excludePatterns: string[];
  /** Phase 5: candidate pool size before reranking (default: 50, up from 20) */
  searchPoolSize: number;
  /** Phase 5: enable HyDE (Hypothetical Document Embedding) query expansion */
  hydeEnabled: boolean;
  /** Phase 5: model to use for HyDE hypothesis generation */
  hydeModel: string;
  /**
   * Anthropic-style contextual chunking. When true, the indexer asks a cheap
   * LLM to generate a 50-100 token explanatory prefix per chunk and prepends
   * it to the embedding input (display content is unchanged).
   * Default: false. Enabling requires a full re-index to take effect.
   * Reference: https://www.anthropic.com/news/contextual-retrieval
   */
  contextualChunkingEnabled: boolean;
  /** Model used to generate the per-chunk contextual prefix. Cheap + fast preferred. */
  contextualChunkingModel: string;
  /**
   * Maximum tokens for the generated contextual prefix.
   * Anthropic recommends 50-100 tokens of context. We cap generation here.
   */
  contextualChunkingMaxTokens: number;
  /**
   * Maximum bytes of the source document sent in the prompt's cached prefix.
   * Larger documents are head-truncated. Keeps prompt-cache writes bounded
   * and avoids hitting the 200K context window for very large files.
   */
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
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
  autoIndexIntervalMs: 15 * 60 * 1000, // 15 minutes
  indexPaths: ['apps/', 'packages/', 'backend/'],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.nx/**',
    '**/coverage/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/target/**',
    '**/.git/**',
  ],
  searchPoolSize: 50,   // Phase 5: two-stage retrieval (top 50 → rerank to N)
  hydeEnabled: false,   // Phase 5: off by default; enable per-query when needed
  hydeModel: 'openai/gpt-4o-mini', // Phase 5: cheap, fast hypothesis generation
  contextualChunkingEnabled: false,                       // opt-in; requires full re-index
  // claude-3-haiku retired 2026-04-19. Haiku 4.5: $1/M input, $0.10/M cache-read.
  // https://openrouter.ai/anthropic/claude-haiku-4.5
  contextualChunkingModel: 'anthropic/claude-haiku-4.5',
  contextualChunkingMaxTokens: 120,                       // ~50-100 tokens of prose + headroom
  contextualChunkingMaxDocumentBytes: 60_000,             // ~15K tokens of doc per cache write
};
