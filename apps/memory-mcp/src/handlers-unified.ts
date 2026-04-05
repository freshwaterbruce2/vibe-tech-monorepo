import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  LearningBridge,
  MemoryManager,
} from '@vibetech/memory';
import { UnifiedSearch } from '@vibetech/memory';
import type { UnifiedSource } from '@vibetech/memory';
import type { HandlerArgs } from './handler-types.js';
import { getRagBridge } from './handlers-learning.js';

/**
 * Unified search handler — fans out across semantic, episodic, RAG, and learning
 */
export async function handleUnifiedSearch(
  name: string,
  args: HandlerArgs,
  memoryManager: MemoryManager,
  learningBridge: LearningBridge | null,
): Promise<CallToolResult | null> {
  if (name !== 'memory_search_unified') return null;

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

  // Lazy RAG adapter
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
  const _t0 = Date.now();
  const results = await unifiedSearch.search(query, {
    limit,
    sources: sources ?? undefined,
  });
  memoryManager.latency.record('memory_search_unified', Date.now() - _t0);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
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
      }, null, 2),
    }],
  };
}
