import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  LearningBridge,
  MemoryManager,
  NovaMemory,
} from '@vibetech/memory';
import type { HandlerArgs, SummarizationDeps } from './handler-types.js';

// Module-level lazy cache for rag-bridge
let _ragBridgePromise: Promise<typeof import('./rag-bridge.js')> | null = null;
async function getRagBridge() {
  _ragBridgePromise ??= import('./rag-bridge.js').catch((err) => {
    _ragBridgePromise = null;
    throw err;
  });
  return _ragBridgePromise;
}

function errorResponse(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

async function handleLearningSync(
  args: HandlerArgs,
  learningBridge: LearningBridge | null,
): Promise<CallToolResult> {
  if (!learningBridge) {
    return errorResponse('Learning bridge not available');
  }
  const { since } = args as { limit?: number; since?: number };
  const sinceTimestamp = since ? new Date(since).toISOString() : undefined;
  const result = await learningBridge.syncFromLearningSystem(sinceTimestamp);
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

function handleLearningAgentContext(
  args: HandlerArgs,
  learningBridge: LearningBridge | null,
): CallToolResult {
  if (!learningBridge) {
    return errorResponse('Learning bridge not available');
  }
  const { agentId, limit = 20 } = args as { agentId?: string; limit?: number };
  if (!agentId) {
    return errorResponse('agentId is required');
  }
  const context = learningBridge.getAgentContext(agentId, limit);
  return { content: [{ type: 'text', text: JSON.stringify(context, null, 2) }] };
}

function handleLearningHealth(learningBridge: LearningBridge | null): CallToolResult {
  if (!learningBridge) {
    return errorResponse('Learning bridge not available');
  }
  const health = learningBridge.healthCheck();
  return { content: [{ type: 'text', text: JSON.stringify(health, null, 2) }] };
}

function handleLearningWritePattern(
  args: HandlerArgs,
  learningBridge: LearningBridge | null,
): CallToolResult {
  if (!learningBridge) {
    return errorResponse('Learning bridge not available');
  }
  const {
    type: patternType,
    description: patternDesc,
    confidence = 0.7,
    metadata: patternMeta,
  } = args as {
    type: string;
    description: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  };
  if (!patternType || !patternDesc) {
    return errorResponse('type and description are required');
  }
  const written = learningBridge.writeBackPattern({
    type: patternType,
    description: patternDesc,
    confidence,
    metadata: patternMeta,
  });
  return {
    content: [{ type: 'text', text: JSON.stringify({ success: written, patternType, confidence }) }],
  };
}

function handleLearningRecordExecution(
  args: HandlerArgs,
  learningBridge: LearningBridge | null,
): CallToolResult {
  if (!learningBridge) {
    return errorResponse('Learning bridge not available');
  }
  const execArgs = args as {
    agentId: string;
    projectName?: string;
    taskType: string;
    toolsUsed?: string;
    success: boolean;
    executionTimeMs?: number;
    errorMessage?: string;
    context?: string;
  };
  if (!execArgs.agentId || !execArgs.taskType) {
    return errorResponse('agentId and taskType are required');
  }
  const recorded = learningBridge.recordExecution(execArgs);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: recorded,
        agentId: execArgs.agentId,
        taskType: execArgs.taskType,
      }),
    }],
  };
}

async function handleRagSearch(args: HandlerArgs): Promise<CallToolResult> {
  const { query, limit = 5, fileTypes, pathPrefix } = args as {
    query: string;
    limit?: number;
    fileTypes?: string[];
    pathPrefix?: string;
  };
  try {
    const { ragSearch } = await getRagBridge();
    const result = await ragSearch({ query, limit, fileTypes, pathPrefix });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2),
      }],
      isError: true,
    };
  }
}

async function handleRagIndexStatus(): Promise<CallToolResult> {
  try {
    const { ragIndexStatus } = await getRagBridge();
    const status = await ragIndexStatus();
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2),
      }],
      isError: true,
    };
  }
}

async function handleRagInvalidate(args: HandlerArgs): Promise<CallToolResult> {
  const { filePaths } = args as { filePaths: string[] };
  try {
    const { ragInvalidate } = await getRagBridge();
    const result = await ragInvalidate(filePaths);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2),
      }],
      isError: true,
    };
  }
}

async function handleRagTriggerIndex(): Promise<CallToolResult> {
  try {
    const { ragTriggerIndex } = await getRagBridge();
    const result = await ragTriggerIndex();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: (error as Error).message, status: 'rag_init_failed' }, null, 2),
      }],
      isError: true,
    };
  }
}

async function handleSummarizeSession(
  args: HandlerArgs,
  summarizationDeps: SummarizationDeps,
  memoryManager: MemoryManager,
): Promise<CallToolResult> {
  const { summarizer } = summarizationDeps;
  if (!summarizer) {
    return errorResponse('Hierarchical summarizer not available');
  }
  const db = memoryManager.getDb();
  const result = await summarizer.run(db);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        sessionsCreated: result.sessionsCreated,
        topicsCreated: result.topicsCreated,
        domainsCreated: result.domainsCreated,
        totalEpisodesProcessed: result.totalEpisodesProcessed,
        message: 'Hierarchical summarization complete',
      }, null, 2),
    }],
  };
}

function handleSummarizeStats(
  args: HandlerArgs,
  summarizationDeps: SummarizationDeps,
  memoryManager: MemoryManager,
): CallToolResult {
  const { summarizer } = summarizationDeps;
  if (!summarizer) {
    return errorResponse('Hierarchical summarizer not available');
  }
  const db = memoryManager.getDb();
  const stats = summarizer.getStats(db);
  return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
}

async function handleDecayStats(
  args: HandlerArgs,
  summarizationDeps: SummarizationDeps,
  memoryManager: MemoryManager,
  novaMemory: NovaMemory | null,
): Promise<CallToolResult> {
  const { decay } = summarizationDeps;
  if (!decay) {
    return errorResponse('Memory decay not available');
  }
  const db = memoryManager.getDb();
  const activeProjectName = novaMemory ? (await novaMemory.getContext())?.name : undefined;
  const stats = decay.getStats(db, activeProjectName);
  return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
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
    case 'memory_learning_sync': return handleLearningSync(args, learningBridge);
    case 'memory_learning_agent_context': return handleLearningAgentContext(args, learningBridge);
    case 'memory_learning_health': return handleLearningHealth(learningBridge);
    case 'memory_learning_write_pattern': return handleLearningWritePattern(args, learningBridge);
    case 'memory_learning_record_execution': return handleLearningRecordExecution(args, learningBridge);
    case 'memory_rag_search': return handleRagSearch(args);
    case 'memory_rag_index_status': return handleRagIndexStatus();
    case 'memory_rag_invalidate': return handleRagInvalidate(args);
    case 'memory_rag_trigger_index': return handleRagTriggerIndex();
    case 'memory_summarize_session': return handleSummarizeSession(args, summarizationDeps, memoryManager);
    case 'memory_summarize_stats': return handleSummarizeStats(args, summarizationDeps, memoryManager);
    case 'memory_decay_stats': return handleDecayStats(args, summarizationDeps, memoryManager, novaMemory);
    default: return null;
  }
}

/** Expose getRagBridge for unified search handler */
export { getRagBridge };
