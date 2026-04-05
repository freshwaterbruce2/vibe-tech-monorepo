import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  LearningBridge,
  MemoryManager,
  NovaMemory,
} from '@vibetech/memory';
import type { HandlerArgs, SummarizationDeps } from './handler-types.js';

// Module-level lazy cache for rag-bridge
let _ragBridgePromise: Promise<typeof import('./rag-bridge.js')> | null = null;
function getRagBridge() {
  if (!_ragBridgePromise) {
    _ragBridgePromise = import('./rag-bridge.js').catch((err) => {
      _ragBridgePromise = null;
      throw err;
    });
  }
  return _ragBridgePromise;
}

/**
 * Learning, RAG pipeline, and summarization/decay handlers
 */
export async function handleLearning(
  name: string,
  args: HandlerArgs,
  learningBridge: LearningBridge | null,
  summarizationDeps: SummarizationDeps,
  memoryManager: MemoryManager,
  novaMemory: NovaMemory | null,
): Promise<CallToolResult | null> {
  switch (name) {
    // ── Learning System Integration ──────────────
    case 'memory_learning_sync': {
      if (!learningBridge) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Learning bridge not available' }) }], isError: true };
      }
      const { since } = args as { limit?: number; since?: number };
      const sinceTimestamp = since ? new Date(since).toISOString() : undefined;
      const result = await learningBridge.syncFromLearningSystem(sinceTimestamp);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'memory_learning_agent_context': {
      if (!learningBridge) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Learning bridge not available' }) }], isError: true };
      }
      const { agentId, limit = 20 } = args as { agentId?: string; limit?: number };
      if (!agentId) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'agentId is required' }) }], isError: true };
      }
      const context = learningBridge.getAgentContext(agentId, limit);
      return { content: [{ type: 'text', text: JSON.stringify(context, null, 2) }] };
    }

    case 'memory_learning_health': {
      if (!learningBridge) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Learning bridge not available', healthy: false }) }], isError: true };
      }
      const health = learningBridge.healthCheck();
      return { content: [{ type: 'text', text: JSON.stringify(health, null, 2) }] };
    }

    // ── RAG Pipeline ──────────────
    case 'memory_rag_search': {
      const { query, limit = 5, fileTypes, pathPrefix } = args as {
        query: string; limit?: number; fileTypes?: string[]; pathPrefix?: string;
      };
      try {
        const { ragSearch } = await getRagBridge();
        const result = await ragSearch({ query, limit, fileTypes, pathPrefix });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2) }],
          isError: true,
        };
      }
    }

    case 'memory_rag_index_status': {
      try {
        const { ragIndexStatus } = await getRagBridge();
        const status = await ragIndexStatus();
        return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2) }],
          isError: true,
        };
      }
    }

    case 'memory_rag_invalidate': {
      const { filePaths } = args as { filePaths: string[] };
      try {
        const { ragInvalidate } = await getRagBridge();
        const result = await ragInvalidate(filePaths);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2) }],
          isError: true,
        };
      }
    }

    case 'memory_rag_trigger_index': {
      try {
        const { ragTriggerIndex } = await getRagBridge();
        const result = await ragTriggerIndex();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2) }],
          isError: true,
        };
      }
    }

    // ── Summarization & Decay ──────────────
    case 'memory_summarize_session': {
      const { summarizer } = summarizationDeps;
      if (!summarizer) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Hierarchical summarizer not available' }) }], isError: true };
      }
      const db = memoryManager.getDb();
      const result = await summarizer.run(db);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            sessionsCreated: result.sessionsCreated, topicsCreated: result.topicsCreated,
            domainsCreated: result.domainsCreated, totalEpisodesProcessed: result.totalEpisodesProcessed,
            message: 'Hierarchical summarization complete',
          }, null, 2),
        }],
      };
    }

    case 'memory_summarize_stats': {
      const { summarizer } = summarizationDeps;
      if (!summarizer) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Hierarchical summarizer not available' }) }], isError: true };
      }
      const db = memoryManager.getDb();
      const stats = summarizer.getStats(db);
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }

    case 'memory_decay_stats': {
      const { decay } = summarizationDeps;
      if (!decay) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Memory decay not available' }) }], isError: true };
      }
      const db = memoryManager.getDb();
      const activeProjectName = novaMemory ? (await novaMemory.getContext())?.name : undefined;
      const stats = decay.getStats(db, activeProjectName);
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }

    default:
      return null;
  }
}

/** Expose getRagBridge for unified search handler */
export { getRagBridge };
