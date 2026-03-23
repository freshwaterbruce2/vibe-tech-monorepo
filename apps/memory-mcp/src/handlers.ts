import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  CryptoMemory,
  GitMemory,
  HierarchicalSummarizer,
  LearningBridge,
  LlmSummarizer,
  MarkdownExporter,
  MemoryConsolidator,
  MemoryDecay,
  MemoryManager,
  NovaMemory,
  PatternAnalyzer,
  SearchResult,
  SemanticMemory,
  ProceduralMemory,
  EpisodicMemory,
  Suggestion,
} from '@vibetech/memory';
import { UnifiedSearch } from '@vibetech/memory';
import type { UnifiedSource } from '@vibetech/memory';

// Module-level lazy cache for rag-bridge (avoids repeated dynamic imports per call)
let _ragBridgePromise: Promise<typeof import('./rag-bridge.js')> | null = null;
function getRagBridge() {
  if (!_ragBridgePromise) {
    _ragBridgePromise = import('./rag-bridge.js').catch((err) => {
      _ragBridgePromise = null; // retry on next call if it fails
      throw err;
    });
  }
  return _ragBridgePromise;
}

export interface SummarizationDeps {
  summarizer: HierarchicalSummarizer | null;
  decay: MemoryDecay | null;
  llm: LlmSummarizer | null;
}

/**
 * Handle MCP tool calls
 */
export async function handleToolCall(
  request: CallToolRequest,
  memoryManager: MemoryManager,
  analyzer: PatternAnalyzer | null = null,
  exporter: MarkdownExporter | null = null,
  consolidator: MemoryConsolidator | null = null,
  cryptoMemory: CryptoMemory | null = null,
  gitMemory: GitMemory | null = null,
  novaMemory: NovaMemory | null = null,
  learningBridge: LearningBridge | null = null,
  summarizationDeps: SummarizationDeps = { summarizer: null, decay: null, llm: null },
): Promise<CallToolResult> {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'memory_search_semantic': {
        const { query, limit = 5 } = args as { query: string; limit?: number };
        const results = await memoryManager.semantic.search(query, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: results.map((r: SearchResult<SemanticMemory>) => ({
                    text: r.item.text,
                    category: r.item.category,
                    importance: r.item.importance,
                    score: r.score.toFixed(3),
                    metadata: r.item.metadata,
                  })),
                  count: results.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_search_episodic': {
        const { query, limit = 10 } = args as { query: string; limit?: number };
        const results = memoryManager.episodic.search(query, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: results.map((r: SearchResult<EpisodicMemory>) => ({
                    query: r.item.query,
                    response: r.item.response,
                    timestamp: new Date(r.item.timestamp).toISOString(),
                    sourceId: r.item.sourceId,
                    score: r.score.toFixed(3),
                  })),
                  count: results.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_get_recent': {
        const { sourceId, limit = 10 } = args as { sourceId?: string; limit?: number };
        const memories = memoryManager.episodic.getRecent(limit, sourceId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  memories: memories.map((m: EpisodicMemory) => ({
                    query: m.query,
                    response: m.response,
                    timestamp: new Date(m.timestamp).toISOString(),
                    sourceId: m.sourceId,
                    sessionId: m.sessionId,
                  })),
                  count: memories.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_add_semantic': {
        const {
          text,
          category,
          importance = 5,
          metadata,
        } = args as {
          text: string;
          category?: string;
          importance?: number;
          metadata?: Record<string, unknown>;
        };

        const id = await memoryManager.semantic.add({
          text,
          category,
          importance,
          metadata,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, id, message: 'Semantic memory stored' }),
            },
          ],
        };
      }

      case 'memory_add_episodic': {
        const { sourceId, query, response, sessionId, metadata } = args as {
          sourceId: string;
          query: string;
          response: string;
          sessionId?: string;
          metadata?: Record<string, unknown>;
        };

        const id = memoryManager.episodic.add({
          sourceId,
          query,
          response,
          timestamp: Date.now(),
          sessionId,
          metadata,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, id, message: 'Episodic memory stored' }),
            },
          ],
        };
      }

      case 'memory_track_pattern': {
        const {
          pattern,
          context,
          successful = true,
          metadata,
        } = args as {
          pattern: string;
          context: string;
          successful?: boolean;
          metadata?: Record<string, unknown>;
        };

        memoryManager.procedural.upsert({
          pattern,
          context,
          successRate: successful ? 1.0 : 0.0,
          lastUsed: Date.now(),
          metadata,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Procedural pattern tracked' }),
            },
          ],
        };
      }

      case 'memory_get_patterns': {
        const { sortBy = 'frequency', limit = 10 } = args as {
          sortBy?: 'frequency' | 'success';
          limit?: number;
        };

        const patterns =
          sortBy === 'frequency'
            ? memoryManager.procedural.getMostFrequent(limit)
            : memoryManager.procedural.getMostSuccessful(limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  patterns: patterns.map((p: ProceduralMemory) => ({
                    pattern: p.pattern,
                    context: p.context,
                    frequency: p.frequency,
                    successRate: p.successRate.toFixed(2),
                  })),
                  count: patterns.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_health': {
        const health = await memoryManager.healthCheck();
        const stats = memoryManager.getStats();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  healthy: health.healthy,
                  message: health.message,
                  database: {
                    healthy: health.database,
                    episodicCount: stats.database.episodicCount,
                    semanticCount: stats.database.semanticCount,
                    proceduralCount: stats.database.proceduralCount,
                    sizeBytes: stats.database.dbSizeBytes,
                  },
                  embedding: {
                    healthy: health.embedding,
                    provider: stats.embedding.provider,
                    dimension: stats.embedding.dimension,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_get_session': {
        const { sessionId } = args as { sessionId: string };
        const memories = memoryManager.episodic.getBySession(sessionId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionId,
                  memories: memories.map((m: EpisodicMemory) => ({
                    query: m.query,
                    response: m.response,
                    timestamp: new Date(m.timestamp).toISOString(),
                    sourceId: m.sourceId,
                    metadata: m.metadata,
                  })),
                  count: memories.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_search_timerange': {
        const {
          startTime,
          endTime,
          query,
          limit = 50,
        } = args as {
          startTime: number;
          endTime: number;
          query?: string;
          limit?: number;
        };

        const memories = memoryManager.episodic.getTimeRange(startTime, endTime, limit);

        // Filter by query if provided
        const filtered = query
          ? memories.filter(
              (m: EpisodicMemory) =>
                m.query.toLowerCase().includes(query.toLowerCase()) ||
                m.response.toLowerCase().includes(query.toLowerCase()),
            )
          : memories;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  timeRange: {
                    start: new Date(startTime).toISOString(),
                    end: new Date(endTime).toISOString(),
                  },
                  memories: filtered.map((m: EpisodicMemory) => ({
                    query: m.query,
                    response: m.response,
                    timestamp: new Date(m.timestamp).toISOString(),
                    sourceId: m.sourceId,
                    sessionId: m.sessionId,
                  })),
                  count: filtered.length,
                  totalInRange: memories.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_suggest': {
        if (!analyzer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Pattern analyzer not available' }),
              },
            ],
            isError: true,
          };
        }

        const { limit = 5 } = args as { limit?: number };
        const suggestions = await analyzer.suggestNextActions(limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  suggestions: suggestions.map((s: Suggestion) => ({
                    type: s.type,
                    title: s.title,
                    description: s.description,
                    confidence: s.confidence.toFixed(2),
                    evidence: s.evidence,
                    actionable: s.actionable,
                  })),
                  count: suggestions.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_export': {
        if (!exporter) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Markdown exporter not available' }),
              },
            ],
            isError: true,
          };
        }

        const {
          format = 'full',
          sessionId,
          category,
          startTime,
          endTime,
        } = args as {
          format?: 'full' | 'session' | 'knowledge';
          sessionId?: string;
          category?: string;
          startTime?: number;
          endTime?: number;
        };

        let markdown: string;

        if (format === 'session') {
          if (!sessionId) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: 'sessionId required for format=session' }),
                },
              ],
              isError: true,
            };
          }
          markdown = exporter.generateSessionSummary(sessionId);
        } else if (format === 'knowledge') {
          markdown = await exporter.generateKnowledgeBase(category);
        } else {
          markdown = await exporter.generateReport({ category, startTime, endTime });
        }

        return {
          content: [
            {
              type: 'text',
              text: markdown,
            },
          ],
        };
      }

      case 'memory_analyze_pattern': {
        if (!analyzer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Pattern analyzer not available' }),
              },
            ],
            isError: true,
          };
        }

        const { pattern } = args as { pattern: string };
        const insights = analyzer.getPatternInsights(pattern);

        if (!insights) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Pattern not found: ${pattern}` }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  pattern: insights.pattern,
                  frequency: insights.frequency,
                  successRate: insights.successRate.toFixed(2),
                  lastUsed: new Date(insights.lastUsed).toISOString(),
                  relatedPatterns: insights.relatedPatterns,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_consolidate': {
        if (!consolidator) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Memory consolidator not available' }),
              },
            ],
            isError: true,
          };
        }

        const {
          threshold = 0.9,
          dryRun = false,
          category,
        } = args as {
          threshold?: number;
          dryRun?: boolean;
          category?: string;
        };

        const result = await consolidator.consolidate({
          threshold,
          dryRun,
          category,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  merged: result.merged,
                  preserved: result.preserved,
                  deletions: result.deletions.map((d: { deletedId: number; mergedIntoId: number; similarity: number; reason: string }) => ({
                    deletedId: d.deletedId,
                    mergedIntoId: d.mergedIntoId,
                    similarity: d.similarity.toFixed(3),
                    reason: d.reason,
                  })),
                  message: dryRun
                    ? `Would merge ${result.merged} duplicate memories (dry run)`
                    : `Successfully merged ${result.merged} duplicate memories`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_consolidate_preview': {
        if (!consolidator) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Memory consolidator not available' }),
              },
            ],
            isError: true,
          };
        }

        const { threshold = 0.9, category } = args as {
          threshold?: number;
          category?: string;
        };

        const result = await consolidator.preview({ threshold, category });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  potentialMerges: result.merged,
                  currentMemories: result.preserved + result.merged,
                  afterMerge: result.preserved,
                  savings: result.merged,
                  deletions: result.deletions.map((d: { deletedId: number; mergedIntoId: number; similarity: number; reason: string }) => ({
                    deletedId: d.deletedId,
                    mergedIntoId: d.mergedIntoId,
                    similarity: d.similarity.toFixed(3),
                    reason: d.reason,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Crypto Trading Integration
      case 'memory_track_trade': {
        if (!cryptoMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Crypto memory not available' }) },
            ],
            isError: true,
          };
        }

        const { pair, action, price, amount, reason, confidence, outcome, pnl } = args as any;
        const tradeId = await cryptoMemory.trackTrade({
          pair,
          action,
          price,
          amount,
          reason,
          confidence,
          timestamp: Date.now(),
          outcome,
          pnl,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, tradeId, message: 'Trade decision tracked' }),
            },
          ],
        };
      }

      case 'memory_get_trading_patterns': {
        if (!cryptoMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Crypto memory not available' }) },
            ],
            isError: true,
          };
        }

        const { minWinRate = 0.6 } = args as { minWinRate?: number };
        const patterns = cryptoMemory.getTradingPatterns(minWinRate);

        return {
          content: [
            { type: 'text', text: JSON.stringify({ patterns, count: patterns.length }, null, 2) },
          ],
        };
      }

      case 'memory_trading_suggestions': {
        if (!cryptoMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Crypto memory not available' }) },
            ],
            isError: true,
          };
        }

        const { pair } = args as { pair?: string };
        const suggestions = await cryptoMemory.getSuggestions(pair);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ suggestions, count: suggestions.length }, null, 2),
            },
          ],
        };
      }

      // Git Workflow Integration
      case 'memory_track_commit': {
        if (!gitMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Git memory not available' }) },
            ],
            isError: true,
          };
        }

        const { hash, message, author, branch, filesChanged, additions, deletions } = args as any;
        const commitId = await gitMemory.trackCommit({
          hash,
          message,
          author,
          branch,
          filesChanged,
          additions,
          deletions,
          timestamp: Date.now(),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, commitId, message: 'Commit tracked' }),
            },
          ],
        };
      }

      case 'memory_suggest_git_command': {
        if (!gitMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Git memory not available' }) },
            ],
            isError: true,
          };
        }

        const { currentCommand } = args as { currentCommand: string };
        const suggestion = await gitMemory.suggestNextCommand(currentCommand);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(suggestion || { message: 'No suggestion available' }, null, 2),
            },
          ],
        };
      }

      case 'memory_commit_stats': {
        if (!gitMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Git memory not available' }) },
            ],
            isError: true,
          };
        }

        const stats = await gitMemory.getCommitStats();

        return {
          content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
        };
      }

      // Nova-Agent Context Integration
      case 'memory_set_context': {
        if (!novaMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Nova memory not available' }) },
            ],
            isError: true,
          };
        }

        const { name, path, currentFile, currentTask, recentFiles, recentTasks } = args as any;
        await novaMemory.setContext({
          name,
          path,
          currentFile,
          currentTask,
          recentFiles,
          recentTasks,
          lastActive: Date.now(),
        });

        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, message: 'Context saved' }) },
          ],
        };
      }

      case 'memory_get_context': {
        if (!novaMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Nova memory not available' }) },
            ],
            isError: true,
          };
        }

        const context = await novaMemory.getContext();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(context || { message: 'No context found' }, null, 2),
            },
          ],
        };
      }

      case 'memory_suggest_task': {
        if (!novaMemory) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Nova memory not available' }) },
            ],
            isError: true,
          };
        }

        const suggestion = await novaMemory.suggestNextTask();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(suggestion || { message: 'No tasks pending' }, null, 2),
            },
          ],
        };
      }

      // Learning System Integration (C4)
      case 'memory_learning_sync': {
        if (!learningBridge) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Learning bridge not available' }) },
            ],
            isError: true,
          };
        }

        const { since } = args as { limit?: number; since?: number };
        const sinceTimestamp = since ? new Date(since).toISOString() : undefined;
        const result = await learningBridge.syncFromLearningSystem(sinceTimestamp);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'memory_learning_agent_context': {
        if (!learningBridge) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Learning bridge not available' }) },
            ],
            isError: true,
          };
        }

        const { agentId, limit = 20 } = args as { agentId?: string; limit?: number };
        if (!agentId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'agentId is required' }) }],
            isError: true,
          };
        }
        const context = learningBridge.getAgentContext(agentId, limit);

        return {
          content: [{ type: 'text', text: JSON.stringify(context, null, 2) }],
        };
      }

      case 'memory_learning_health': {
        if (!learningBridge) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Learning bridge not available', healthy: false }),
              },
            ],
            isError: true,
          };
        }

        const health = learningBridge.healthCheck();

        return {
          content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
        };
      }

      // ── RAG Pipeline Integration (WS5) ──────────────
      case 'memory_rag_search': {
        const { query, limit = 5, fileTypes, pathPrefix } = args as {
          query: string;
          limit?: number;
          fileTypes?: string[];
          pathPrefix?: string;
        };

        try {
          const { ragSearch } = await getRagBridge();
          const result = await ragSearch({ query, limit, fileTypes, pathPrefix });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: (error as Error).message, status: 'rag_init_failed' },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      }

      case 'memory_rag_index_status': {
        try {
          const { ragIndexStatus } = await getRagBridge();
          const status = await ragIndexStatus();
          return {
            content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: (error as Error).message, status: 'rag_init_failed' },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      }

      case 'memory_rag_invalidate': {
        const { filePaths } = args as { filePaths: string[] };
        try {
          const { ragInvalidate } = await getRagBridge();
          const result = await ragInvalidate(filePaths);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { error: (error as Error).message, status: 'rag_init_failed' },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      }

      // ── Hierarchical Summarization & Memory Decay ──────────────
      case 'memory_summarize_session': {
        const { summarizer } = summarizationDeps;
        if (!summarizer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Hierarchical summarizer not available' }),
              },
            ],
            isError: true,
          };
        }

        const db = memoryManager.getDb();
        const result = await summarizer.run(db);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  sessionsCreated: result.sessionsCreated,
                  topicsCreated: result.topicsCreated,
                  domainsCreated: result.domainsCreated,
                  totalEpisodesProcessed: result.totalEpisodesProcessed,
                  message: `Hierarchical summarization complete`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case 'memory_summarize_stats': {
        const { summarizer } = summarizationDeps;
        if (!summarizer) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Hierarchical summarizer not available' }),
              },
            ],
            isError: true,
          };
        }

        const db = memoryManager.getDb();
        const stats = summarizer.getStats(db);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case 'memory_decay_stats': {
        const { decay } = summarizationDeps;
        if (!decay) {
          return {
            content: [
              { type: 'text', text: JSON.stringify({ error: 'Memory decay not available' }) },
            ],
            isError: true,
          };
        }

        const db = memoryManager.getDb();
        const stats = decay.getStats(db);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case 'memory_search_unified': {
        const { query, limit = 10, sources } = args as {
          query: string;
          limit?: number;
          sources?: UnifiedSource[];
        };

        if (!query) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'query is required' }) }],
            isError: true,
          };
        }

        // Lazy RAG adapter — wraps the existing rag-bridge for unified search
        let ragAdapter = null;
        try {
          const { ragSearch } = await getRagBridge();
          ragAdapter = {
            search: async (p: { query: string; limit?: number }) => {
              const res = await ragSearch({ query: p.query, limit: p.limit });
              return {
                results: res.results.map((r) => ({
                  filePath: r.filePath,
                  content: r.content,
                  score: r.score,
                  language: r.language,
                })),
              };
            },
          };
        } catch {
          // RAG bridge unavailable — unified search proceeds without RAG source
        }

        const unifiedSearch = new UnifiedSearch(memoryManager, ragAdapter, learningBridge);
        const results = await unifiedSearch.search(query, {
          limit,
          sources: sources ?? undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  resultCount: results.length,
                  results: results.map((r) => ({
                    text: r.text.slice(0, 500),
                    score: r.score,
                    source: r.source,
                    sourceId: r.sourceId,
                    metadata: r.metadata,
                    timestamp: r.timestamp,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            tool: name,
          }),
        },
      ],
      isError: true,
    };
  }
}
