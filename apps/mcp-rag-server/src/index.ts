/**
 * MCP RAG Server
 * Exposes the Nova-Agent LanceDB RAG pipeline to Claude Desktop / Claude Code.
 *
 * Tools:
 *   rag_search          — Hybrid vector + FTS search over the monorepo index
 *   rag_index_status    — Check index state (file count, chunk count, pending files)
 *   rag_index_run       — Trigger an incremental (or full) re-index
 *   rag_invalidate      — Force re-index of specific paths
 *   db_query_trading    — Read-only SQL against D:\databases\trading.db
 *   db_query_learning   — Read-only SQL against D:\databases\agent_learning.db
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  RAGIndexer,
  RAGRetriever,
  RAGReranker,
  RAGCache,
  TradingConnector,
  LearningConnector,
  DEFAULT_RAG_CONFIG,
} from './rag/index.js';
import type { SearchQuery, SearchResult } from './rag/index.js';

// ─── Globals ─────────────────────────────────────────────────────────────────

const config = DEFAULT_RAG_CONFIG;
const indexer = new RAGIndexer(config);
const retriever = new RAGRetriever(config);
const reranker = new RAGReranker();
const cache = new RAGCache(config);
const trading = new TradingConnector();
const learning = new LearningConnector();
let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  await indexer.init();
  trading.connect();
  learning.connect();
  initialized = true;
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'mcp-rag-server', version: '1.0.0' });

// ─── Tool: rag_search ────────────────────────────────────────────────────────

server.registerTool(
  'rag_search',
  {
    title: 'RAG Search',
    description:
      'Hybrid vector + full-text search over the indexed monorepo codebase. ' +
      'Returns the most relevant code chunks, functions, components, or docs. ' +
      'Use this to find implementations, understand patterns, or locate code.',
    inputSchema: z.object({
      query: z.string().describe('Natural language search query'),
      limit: z.number().int().min(1).max(20).default(5).describe('Number of results'),
      pathPrefix: z.string().optional().describe('Filter to path prefix e.g. "apps/nova-agent"'),
      chunkTypes: z
        .array(z.enum(['function', 'component', 'class', 'method', 'export', 'module', 'text']))
        .optional()
        .describe('Filter by chunk type'),
      useCache: z.boolean().default(true).describe('Return cached results if available'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async ({ query, limit, pathPrefix, chunkTypes, useCache }) => {
    await ensureInitialized();
    const cacheKey = `${query}|${limit}|${pathPrefix ?? ''}|${chunkTypes?.join(',') ?? ''}`;
    if (useCache) {
      const cached = cache.get(cacheKey);
      if (cached) return { content: [{ type: 'text' as const, text: formatResults(cached, query, true) }] };
    }
    const table = indexer.getTable();
    if (!table) return { content: [{ type: 'text' as const, text: 'Index is empty. Run rag_index_run first.' }] };
    const searchQuery: SearchQuery = { text: query, limit, pathPrefix, chunkTypes };
    const candidates = await retriever.search(table, searchQuery);
    const reranked = await reranker.rerank(candidates, query, limit);
    if (useCache) cache.set(cacheKey, reranked.results);
    return { content: [{ type: 'text' as const, text: formatResults(reranked.results, query, false) }] };
  },
);

// ─── Tool: rag_index_status ──────────────────────────────────────────────────

server.registerTool(
  'rag_index_status',
  {
    title: 'RAG Index Status',
    description: 'Get current RAG index state: file count, chunk count, pending files, cache stats.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async () => {
    await ensureInitialized();
    const state = indexer.getState();
    const cs = cache.getStats();
    const text = [
      '## RAG Index Status',
      '',
      `**Files indexed:** ${state.totalFiles}`,
      `**Total chunks:** ${state.totalChunks}`,
      `**Pending re-index:** ${state.pendingFiles}`,
      `**Index running:** ${state.isRunning}`,
      '',
      '### Cache',
      `**Entries:** ${cs.totalEntries}`,
      `**Hit rate:** ${(cs.hitRate * 100).toFixed(1)}%`,
      `**Hits / Misses:** ${cs.hits} / ${cs.misses}`,
    ].join('\n');
    return { content: [{ type: 'text' as const, text }] };
  },
);

// ─── Tool: rag_index_run ─────────────────────────────────────────────────────

server.registerTool(
  'rag_index_run',
  {
    title: 'Run RAG Index',
    description:
      'Trigger an incremental or full re-index of the monorepo. ' +
      'Incremental (default) only re-processes files changed since last run. ' +
      'Synchronous — returns when complete.',
    inputSchema: z.object({
      full: z.boolean().default(false).describe('Full re-index vs incremental'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  async ({ full }) => {
    await ensureInitialized();
    const result = await indexer.index({ full });
    const lines = [
      `## Index Run Complete (${full ? 'full' : 'incremental'})`,
      '',
      `**Files processed:** ${result.filesProcessed}`,
      `**Chunks created:** ${result.chunksCreated}`,
      `**Chunks removed:** ${result.chunksRemoved}`,
      `**Duration:** ${(result.durationMs / 1000).toFixed(1)}s`,
    ];
    if (result.errors.length > 0) {
      lines.push('', `**Errors (${result.errors.length}):**`);
      for (const e of result.errors.slice(0, 10)) {
        lines.push(`- \`${e.filePath || 'general'}\`: ${e.error}`);
      }
    }
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  },
);

// ─── Tool: rag_invalidate ────────────────────────────────────────────────────

server.registerTool(
  'rag_invalidate',
  {
    title: 'Invalidate RAG Paths',
    description:
      'Mark specific file paths for re-index on the next rag_index_run. ' +
      'Also clears any cached query results that referenced those paths. ' +
      'Use after editing files you want reflected immediately in search.',
    inputSchema: z.object({
      paths: z.array(z.string()).min(1).describe(
        'Relative paths to invalidate, e.g. ["apps/nova-agent/src/rag/indexer.ts"]',
      ),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async ({ paths }) => {
    await ensureInitialized();
    await indexer.invalidate(paths);
    const cleared = cache.invalidateByPaths(paths);
    return {
      content: [{
        type: 'text' as const,
        text: `Invalidated ${paths.length} path(s). ${cleared} cache entries cleared.\nRun \`rag_index_run\` to re-index.`,
      }],
    };
  },
);

// ─── Tool: db_query_trading ──────────────────────────────────────────────────

server.registerTool(
  'db_query_trading',
  {
    title: 'Query Trading Database',
    description: 'Run a read-only SQL SELECT against D:\\databases\\trading.db. Only SELECT/WITH/PRAGMA allowed.',
    inputSchema: z.object({
      sql: z.string().describe('SQL SELECT query to execute'),
      limit: z.number().int().min(1).max(500).default(50).describe('Max rows to return (auto-injected if missing)'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async ({ sql, limit }) => {
    await ensureInitialized();
    const result = trading.query(injectLimit(sql, limit));
    if (result.error) {
      return { content: [{ type: 'text' as const, text: `**Query error:** ${result.error}\n\nSQL: \`${sql}\`` }] };
    }
    const rows = result.results ?? [];
    return {
      content: [{
        type: 'text' as const,
        text: `**${rows.length} row(s)**\n\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\``,
      }],
    };
  },
);

// ─── Tool: db_query_learning ─────────────────────────────────────────────────

server.registerTool(
  'db_query_learning',
  {
    title: 'Query Learning Database',
    description: 'Run a read-only SQL SELECT against D:\\databases\\agent_learning.db. Contains agent execution history, success/failure patterns, learning data.',
    inputSchema: z.object({
      sql: z.string().describe('SQL SELECT query to execute'),
      limit: z.number().int().min(1).max(500).default(50).describe('Max rows to return (auto-injected if missing)'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  async ({ sql, limit }) => {
    await ensureInitialized();
    const result = learning.query(injectLimit(sql, limit));
    if (result.error) {
      return { content: [{ type: 'text' as const, text: `**Query error:** ${result.error}\n\nSQL: \`${sql}\`` }] };
    }
    const rows = result.results ?? [];
    return {
      content: [{
        type: 'text' as const,
        text: `**${rows.length} row(s)**\n\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\``,
      }],
    };
  },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatResults(results: SearchResult[], query: string, fromCache: boolean): string {
  if (results.length === 0) {
    return `No results for: "${query}"\n\nRun \`rag_index_run\` if the index is empty.`;
  }

  const header = `## Results for: "${query}"${fromCache ? ' *(cached)*' : ''}\n`;

  const items = results.map((r, i) => {
    const pct = (r.score * 100).toFixed(0);
    const src = r.source === 'hybrid' ? '⚡ hybrid' : r.source === 'vector' ? '🔵 vector' : '📝 FTS';
    const label = r.chunk.symbolName ? `${r.chunk.symbolName} (${r.chunk.type})` : r.chunk.type;
    const preview = r.chunk.content.length > 1200
      ? r.chunk.content.slice(0, 1200) + '\n// ...truncated'
      : r.chunk.content;

    return [
      `### ${i + 1}. \`${r.chunk.filePath}\` — ${label} ${src} ${pct}%`,
      `*Lines ${r.chunk.startLine}–${r.chunk.endLine} · ${r.chunk.tokenCount} tokens*`,
      '',
      '```' + r.chunk.language,
      preview,
      '```',
    ].join('\n');
  });

  return header + '\n' + items.join('\n\n---\n\n');
}

function injectLimit(sql: string, limit: number): string {
  return sql.trim().toUpperCase().includes('LIMIT')
    ? sql
    : `${sql.trim()} LIMIT ${limit}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await ensureInitialized();
    const state = indexer.getState();
    console.error(
      `[mcp-rag-server] Ready — ${state.totalFiles} files, ${state.totalChunks} chunks indexed`,
    );
    if (state.totalFiles === 0) {
      console.error('[mcp-rag-server] Index is empty — call rag_index_run to build it');
    }
  } catch (err) {
    console.error('[mcp-rag-server] Init warning (non-fatal):', (err as Error).message);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-rag-server] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[mcp-rag-server] Fatal error:', err);
  process.exit(1);
});
