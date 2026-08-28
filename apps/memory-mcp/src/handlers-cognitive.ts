import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { CognitiveMemoryKind, MemoryManager, SearchResult, SemanticMemory } from '@vibetech/memory';
import type { HandlerArgs } from './handler-types.js';

async function handleStoreOutcome(
  args: HandlerArgs,
  memoryManager: MemoryManager,
): Promise<CallToolResult> {
  const { task, outcome, context, successful = true, confidence, metadata } = args as {
    task: string;
    outcome: string;
    context?: string;
    successful?: boolean;
    confidence?: number;
    metadata?: Record<string, unknown>;
  };

  if (!task || !outcome) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'task and outcome are required' }),
      }],
      isError: true,
    };
  }

  const id = await memoryManager.cognitive.storeOutcome({
    task,
    outcome,
    context,
    successful,
    confidence,
    metadata,
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        id,
        kind: 'outcome',
        message: 'Cognitive outcome stored',
      }),
    }],
  };
}

async function handleStoreAntiPattern(
  args: HandlerArgs,
  memoryManager: MemoryManager,
): Promise<CallToolResult> {
  const { task, antiPattern, context, recommendation, confidence, metadata } = args as {
    task: string;
    antiPattern: string;
    context?: string;
    recommendation?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  };

  if (!task || !antiPattern) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'task and antiPattern are required' }),
      }],
      isError: true,
    };
  }

  const id = await memoryManager.cognitive.storeAntiPattern({
    task,
    antiPattern,
    context,
    recommendation,
    confidence,
    metadata,
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        id,
        kind: 'anti_pattern',
        message: 'Cognitive anti-pattern stored',
      }),
    }],
  };
}

function formatCognitiveResult(result: Awaited<ReturnType<MemoryManager['cognitive']['retrieve']>>[number]) {
  return {
    id: result.record.id,
    kind: result.record.kind,
    task: result.record.task,
    summary: result.record.summary,
    context: result.record.context,
    recommendation: result.record.recommendation,
    score: result.score,
    components: result.components,
    confidence: result.record.confidence,
    metadata: result.record.metadata,
  };
}

function formatSemanticResult(result: SearchResult<SemanticMemory>) {
  return {
    id: result.item.id,
    text: result.item.text.slice(0, 500),
    category: result.item.category,
    score: Number(result.score.toFixed(3)),
    metadata: result.item.metadata,
  };
}

async function handleCognitiveRetrieve(
  args: HandlerArgs,
  memoryManager: MemoryManager,
): Promise<CallToolResult> {
  const {
    query,
    limit = 5,
    kind,
    minScore,
    includeSemantic = false,
  } = args as {
    query: string;
    limit?: number;
    kind?: CognitiveMemoryKind;
    minScore?: number;
    includeSemantic?: boolean;
  };

  if (!query) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'query is required' }) }],
      isError: true,
    };
  }

  const _t0 = Date.now();
  const cognitiveResults = await memoryManager.cognitive.retrieve(query, { limit, kind, minScore });
  memoryManager.latency.record('memory_cognitive_retrieve', Date.now() - _t0);

  const semanticResults = includeSemantic
    ? await memoryManager.semantic.search(query, Math.min(limit, 5))
    : [];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        query,
        resultCount: cognitiveResults.length,
        results: cognitiveResults.map(formatCognitiveResult),
        semanticResults: semanticResults.map(formatSemanticResult),
      }, null, 2),
    }],
  };
}

export async function handleCognitiveMemory(
  name: string,
  args: HandlerArgs,
  memoryManager: MemoryManager,
): Promise<CallToolResult | null> {
  switch (name) {
    case 'memory_cognitive_store_outcome':
      return handleStoreOutcome(args, memoryManager);
    case 'memory_cognitive_store_antipattern':
      return handleStoreAntiPattern(args, memoryManager);
    case 'memory_cognitive_retrieve':
      return handleCognitiveRetrieve(args, memoryManager);
    default:
      return null;
  }
}
