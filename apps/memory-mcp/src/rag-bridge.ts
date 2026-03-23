/**
 * RAG Bridge for Memory MCP
 * Lazily initializes the RAG pipeline (Indexer, Retriever, Reranker, Cache)
 * and exposes search/status/invalidate operations for MCP tool handlers.
 *
 * Static imports allow tsup to bundle nova-agent's RAG modules at build time.
 */

import { RAGIndexer } from '../../nova-agent/src/rag/indexer.js';
import { RAGRetriever } from '../../nova-agent/src/rag/retriever.js';
import { RAGReranker } from '../../nova-agent/src/rag/reranker.js';
import { RAGCache } from '../../nova-agent/src/rag/cache.js';
import type { RAGConfig, SearchResult } from '../../nova-agent/src/rag/types.js';

export interface RAGSearchParams {
  query: string;
  limit?: number;
  fileTypes?: string[];
  pathPrefix?: string;
}

export interface RAGSearchResponse {
  results: Array<{
    filePath: string;
    content: string;
    score: number;
    type: string;
    startLine: number;
    endLine: number;
    symbolName?: string;
    language: string;
  }>;
  cached: boolean;
  durationMs: number;
}

// Lazy-loaded pipeline instances
let indexer: RAGIndexer | null = null;
let retriever: RAGRetriever | null = null;
let reranker: RAGReranker | null = null;
let cache: RAGCache | null = null;
let initialized = false;
let initError: string | null = null;

function getConfig(): RAGConfig {
  return {
    lanceDbPath: process.env.RAG_LANCE_DB_PATH ?? 'D:\\nova-agent-data\\lance-db',
    cachePath: process.env.RAG_CACHE_PATH ?? 'D:\\nova-agent-data\\cache\\query-cache.sqlite',
    hashIndexPath: process.env.RAG_HASH_INDEX_PATH ?? 'D:\\nova-agent-data\\indexes\\file-hashes.json',
    logPath: process.env.RAG_LOG_PATH ?? 'D:\\nova-agent-data\\logs\\rag-operations.log',
    workspaceRoot: process.env.RAG_WORKSPACE_ROOT ?? 'C:\\dev',
    embeddingEndpoint: process.env.RAG_EMBEDDING_ENDPOINT ?? 'http://localhost:3001',
    embeddingModel: process.env.RAG_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    maxChunkTokens: 512,
    chunkOverlapTokens: 64,
    cacheTtlMs: 60 * 60 * 1000,
    autoIndexIntervalMs: 15 * 60 * 1000,
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
  };
}

/**
 * Lazily initialize RAG pipeline components
 */
async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  if (initError) throw new Error(`RAG init failed previously: ${initError}`);

  try {
    const config = getConfig();

    indexer = new RAGIndexer(config);
    await indexer.init();

    retriever = new RAGRetriever(config);
    reranker = new RAGReranker();
    cache = new RAGCache(config);

    initialized = true;
    console.error('[RAG Bridge] Pipeline initialized successfully');
  } catch (error) {
    initError = (error as Error).message;
    console.error('[RAG Bridge] Init failed:', initError);
    throw error;
  }
}

/**
 * Search the RAG index with hybrid vector+FTS search
 */
export async function ragSearch(params: RAGSearchParams): Promise<RAGSearchResponse> {
  const start = Date.now();

  await ensureInitialized();

  // Check cache first
  const cached = cache!.get(params.query);
  if (cached) {
    return {
      results: cached.map(formatResult),
      cached: true,
      durationMs: Date.now() - start,
    };
  }

  // Get the LanceDB table
  const table = indexer!.getTable();
  if (!table) {
    return {
      results: [],
      cached: false,
      durationMs: Date.now() - start,
    };
  }

  const limit = params.limit ?? 5;

  // Run hybrid search
  const candidates = await retriever!.search(table, {
    text: params.query,
    limit,
    fileTypes: params.fileTypes,
    pathPrefix: params.pathPrefix,
  });

  // Rerank with RRF (args: candidates, query, limit)
  const reranked = await reranker!.rerank(candidates, params.query, limit);

  // Cache the results
  cache!.set(params.query, reranked.results);

  return {
    results: reranked.results.map(formatResult),
    cached: false,
    durationMs: Date.now() - start,
  };
}

/**
 * Get current index status
 */
export async function ragIndexStatus(): Promise<Record<string, unknown>> {
  await ensureInitialized();

  const state = indexer!.getState();
  const cacheStats = cache!.getStats();

  return { ...state, cacheStats };
}

/**
 * Invalidate cache for specific file paths
 */
export async function ragInvalidate(filePaths: string[]): Promise<{ invalidated: number; reindexed: boolean }> {
  await ensureInitialized();

  const invalidated = cache!.invalidateByPaths(filePaths);
  await indexer!.invalidate(filePaths);

  return { invalidated, reindexed: false };
}

function formatResult(r: SearchResult) {
  return {
    filePath: r.chunk.filePath,
    content: r.chunk.content,
    score: Math.round(r.score * 1000) / 1000,
    type: r.chunk.type,
    startLine: r.chunk.startLine,
    endLine: r.chunk.endLine,
    symbolName: r.chunk.symbolName,
    language: r.chunk.language,
  };
}