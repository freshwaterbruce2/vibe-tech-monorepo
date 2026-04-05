/**
 * RAG barrel — re-exports from local copies where they exist,
 * cross-references nova-agent source for RAGIndexer and DB connectors.
 */

// Local copies (self-contained within mcp-rag-server)
export { RAGReranker } from './reranker.js';
export { RAGCache } from './cache.js';
export { DEFAULT_RAG_CONFIG } from './types.js';
export type { SearchQuery, SearchResult, RAGConfig, IndexState } from './types.js';

// Cross-project imports from nova-agent (resolved via tsconfig paths, bundled by tsup)
export { RAGIndexer } from '@nova-rag/indexer';
export { RAGRetriever } from '@nova-rag/retriever';
export { TradingConnector } from '@nova-rag/connectors/sqlite-trading';
export { LearningConnector } from '@nova-rag/connectors/sqlite-learning';
