import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  MemoryManager,
  PatternAnalyzer,
  MarkdownExporter,
  MemoryConsolidator,
  SearchResult,
  SemanticMemory,
  ProceduralMemory,
  EpisodicMemory,
  Suggestion,
} from '@vibetech/memory';
import type { HandlerArgs, ConsolidationDeletion } from './handler-types.js';

export async function handleCoreMemory(
  name: string,
  args: HandlerArgs,
  memoryManager: MemoryManager,
  analyzer: PatternAnalyzer | null,
  exporter: MarkdownExporter | null,
  consolidator: MemoryConsolidator | null,
): Promise<CallToolResult | null> {
  switch (name) {
    case 'memory_search_semantic': {
      const { query, limit = 5 } = args as { query: string; limit?: number };
      const _t0 = Date.now();
      const results = await memoryManager.semantic.search(query, limit);
      memoryManager.latency.record('memory_search_semantic', Date.now() - _t0);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            results: results.map((r: SearchResult<SemanticMemory>) => ({
              text: r.item.text, category: r.item.category,
              importance: r.item.importance, score: r.score.toFixed(3),
              metadata: r.item.metadata,
            })),
            count: results.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_search_episodic': {
      const { query, limit = 10 } = args as { query: string; limit?: number };
      const results = memoryManager.episodic.search(query, limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            results: results.map((r: SearchResult<EpisodicMemory>) => ({
              query: r.item.query, response: r.item.response,
              timestamp: new Date(r.item.timestamp).toISOString(),
              sourceId: r.item.sourceId, score: r.score.toFixed(3),
            })),
            count: results.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_get_recent': {
      const { sourceId, limit = 10 } = args as { sourceId?: string; limit?: number };
      const memories = memoryManager.episodic.getRecent(limit, sourceId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            memories: memories.map((m: EpisodicMemory) => ({
              query: m.query, response: m.response,
              timestamp: new Date(m.timestamp).toISOString(),
              sourceId: m.sourceId, sessionId: m.sessionId,
            })),
            count: memories.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_add_semantic': {
      const { text, category, importance = 5, metadata } = args as {
        text: string; category?: string; importance?: number;
        metadata?: Record<string, unknown>;
      };
      const id = await memoryManager.semantic.add({ text, category, importance, metadata });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, id, message: 'Semantic memory stored' }) }],
      };
    }

    case 'memory_add_episodic': {
      const { sourceId, query, response, sessionId, metadata } = args as {
        sourceId: string; query: string; response: string;
        sessionId?: string; metadata?: Record<string, unknown>;
      };
      const id = memoryManager.episodic.add({
        sourceId, query, response, timestamp: Date.now(), sessionId, metadata,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, id, message: 'Episodic memory stored' }) }],
      };
    }

    case 'memory_track_pattern': {
      const { pattern, context, successful = true, metadata } = args as {
        pattern: string; context: string; successful?: boolean;
        metadata?: Record<string, unknown>;
      };
      memoryManager.procedural.upsert({
        pattern, context, successRate: successful ? 1.0 : 0.0,
        lastUsed: Date.now(), metadata,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Procedural pattern tracked' }) }],
      };
    }

    case 'memory_get_patterns': {
      const { sortBy = 'frequency', limit = 10 } = args as {
        sortBy?: 'frequency' | 'success'; limit?: number;
      };
      const patterns = sortBy === 'frequency'
        ? memoryManager.procedural.getMostFrequent(limit)
        : memoryManager.procedural.getMostSuccessful(limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            patterns: patterns.map((p: ProceduralMemory) => ({
              pattern: p.pattern, context: p.context,
              frequency: p.frequency, successRate: p.successRate.toFixed(2),
            })),
            count: patterns.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_health': {
      const health = await memoryManager.healthCheck();
      const stats = memoryManager.getStats();
      const latencyStats: Record<string, { p50: number; p95: number; p99: number; count: number }> = {};
      for (const toolName of memoryManager.latency.getToolNames()) {
        const snap = memoryManager.latency.getStats(toolName);
        if (snap) latencyStats[toolName] = snap;
      }
      const warnings: string[] = [];
      if (stats.database.normStdDev != null && stats.database.avgNorm != null && stats.database.avgNorm > 0) {
        const cv = stats.database.normStdDev / stats.database.avgNorm;
        if (cv > 0.15) warnings.push(`avg norm deviation ${(cv * 100).toFixed(1)}% — possible model mismatch`);
      }
      if (stats.embedding.staleDimensionCount && stats.embedding.staleDimensionCount > 0) {
        warnings.push(`${stats.embedding.staleDimensionCount} semantic memories use a different embedding model and will be skipped during search`);
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            healthy: health.healthy, message: health.message,
            database: {
              healthy: health.database, episodicCount: stats.database.episodicCount,
              semanticCount: stats.database.semanticCount, proceduralCount: stats.database.proceduralCount,
              sizeBytes: stats.database.dbSizeBytes,
            },
            embedding: {
              healthy: health.embedding, provider: stats.embedding.provider,
              dimension: stats.embedding.dimension, modelVersion: stats.embedding.modelVersion ?? null,
              avgNorm: stats.database.avgNorm ?? null, normStdDev: stats.database.normStdDev ?? null,
              staleDimensionCount: stats.embedding.staleDimensionCount ?? 0,
            },
            latency: latencyStats,
            retrieval: { cacheHitRate: null },
            warnings,
          }, null, 2),
        }],
      };
    }

    case 'memory_get_session': {
      const { sessionId } = args as { sessionId: string };
      const memories = memoryManager.episodic.getBySession(sessionId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            sessionId,
            memories: memories.map((m: EpisodicMemory) => ({
              query: m.query, response: m.response,
              timestamp: new Date(m.timestamp).toISOString(),
              sourceId: m.sourceId, metadata: m.metadata,
            })),
            count: memories.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_search_timerange': {
      const { startTime, endTime, query, limit = 50 } = args as {
        startTime: number; endTime: number; query?: string; limit?: number;
      };
      const memories = memoryManager.episodic.getTimeRange(startTime, endTime, limit);
      const filtered = query
        ? memories.filter((m: EpisodicMemory) =>
            m.query.toLowerCase().includes(query.toLowerCase()) ||
            m.response.toLowerCase().includes(query.toLowerCase()))
        : memories;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            timeRange: { start: new Date(startTime).toISOString(), end: new Date(endTime).toISOString() },
            memories: filtered.map((m: EpisodicMemory) => ({
              query: m.query, response: m.response,
              timestamp: new Date(m.timestamp).toISOString(),
              sourceId: m.sourceId, sessionId: m.sessionId,
            })),
            count: filtered.length, totalInRange: memories.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_suggest': {
      if (!analyzer) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Pattern analyzer not available' }) }], isError: true };
      }
      const { limit = 5 } = args as { limit?: number };
      const suggestions = await analyzer.suggestNextActions(limit);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            suggestions: suggestions.map((s: Suggestion) => ({
              type: s.type, title: s.title, description: s.description,
              confidence: s.confidence.toFixed(2), evidence: s.evidence, actionable: s.actionable,
            })),
            count: suggestions.length,
          }, null, 2),
        }],
      };
    }

    case 'memory_export': {
      if (!exporter) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Markdown exporter not available' }) }], isError: true };
      }
      const { format = 'full', sessionId, category, startTime, endTime } = args as {
        format?: 'full' | 'session' | 'knowledge'; sessionId?: string;
        category?: string; startTime?: number; endTime?: number;
      };
      let markdown: string;
      if (format === 'session') {
        if (!sessionId) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'sessionId required for format=session' }) }], isError: true };
        }
        markdown = exporter.generateSessionSummary(sessionId);
      } else if (format === 'knowledge') {
        markdown = await exporter.generateKnowledgeBase(category);
      } else {
        markdown = await exporter.generateReport({ category, startTime, endTime });
      }
      return { content: [{ type: 'text', text: markdown }] };
    }

    case 'memory_analyze_pattern': {
      if (!analyzer) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Pattern analyzer not available' }) }], isError: true };
      }
      const { pattern } = args as { pattern: string };
      const insights = analyzer.getPatternInsights(pattern);
      if (!insights) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Pattern not found: ${pattern}` }) }], isError: true };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            pattern: insights.pattern, frequency: insights.frequency,
            successRate: insights.successRate.toFixed(2),
            lastUsed: new Date(insights.lastUsed).toISOString(),
            relatedPatterns: insights.relatedPatterns,
          }, null, 2),
        }],
      };
    }

    case 'memory_consolidate': {
      if (!consolidator) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Memory consolidator not available' }) }], isError: true };
      }
      const { threshold = 0.9, dryRun = false, category } = args as {
        threshold?: number; dryRun?: boolean; category?: string;
      };
      const result = await consolidator.consolidate({ threshold, dryRun, category });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            merged: result.merged, preserved: result.preserved,
            deletions: result.deletions.map((d: ConsolidationDeletion) => ({
              deletedId: d.deletedId, mergedIntoId: d.mergedIntoId,
              similarity: d.similarity.toFixed(3), reason: d.reason,
            })),
            message: dryRun
              ? `Would merge ${result.merged} duplicate memories (dry run)`
              : `Successfully merged ${result.merged} duplicate memories`,
          }, null, 2),
        }],
      };
    }

    case 'memory_consolidate_preview': {
      if (!consolidator) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Memory consolidator not available' }) }], isError: true };
      }
      const { threshold = 0.9, category } = args as { threshold?: number; category?: string };
      const result = await consolidator.preview({ threshold, category });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            potentialMerges: result.merged, currentMemories: result.preserved + result.merged,
            afterMerge: result.preserved, savings: result.merged,
            deletions: result.deletions.map((d: ConsolidationDeletion) => ({
              deletedId: d.deletedId, mergedIntoId: d.mergedIntoId,
              similarity: d.similarity.toFixed(3), reason: d.reason,
            })),
          }, null, 2),
        }],
      };
    }

    case 'memory_conflict_check': {
      const { text } = args as { text: string; category?: string };
      if (!text) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'text is required' }) }], isError: true };
      }
      const conflictResult = await memoryManager.semantic.findConflictsForText(text, 0.85, 5);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            input: { text: text.slice(0, 200), category: (args as { category?: string }).category },
            maxSimilarity: conflictResult.maxSimilarity,
            recommendation: conflictResult.recommendation,
            conflicts: conflictResult.conflicts.map((c) => ({
              id: c.id, text: c.text.slice(0, 300),
              similarity: Number(c.similarity.toFixed(4)), category: c.category,
            })),
            conflictCount: conflictResult.conflicts.length,
          }, null, 2),
        }],
      };
    }

    default:
      return null;
  }
}
