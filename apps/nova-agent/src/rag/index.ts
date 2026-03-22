/**
 * RAG Pipeline - Barrel Export
 * LanceDB-backed hybrid search with AST-aware chunking.
 */

export { RAGEmbedder } from './embedder.js';
export { RAGChunker } from './chunker.js';
export { RAGIndexer } from './indexer.js';
export { RAGRetriever } from './retriever.js';
export { RAGReranker } from './reranker.js';
export { RAGCache } from './cache.js';
export { ragIndexPipeline } from './inngest-functions.js';
export { TradingConnector } from './connectors/sqlite-trading.js';
export { LearningConnector } from './connectors/sqlite-learning.js';

export type {
  Chunk,
  ChunkType,
  EmbeddingResult,
  EmbeddingBatchResult,
  SearchQuery,
  SearchResult,
  IndexState,
  FileHash,
  IndexResult,
  CacheEntry,
  CacheStats,
  RerankCandidate,
  RerankResult,
  DatabaseSchema,
  ConnectorQuery,
  RAGConfig,
} from './types.js';

export { DEFAULT_RAG_CONFIG } from './types.js';
