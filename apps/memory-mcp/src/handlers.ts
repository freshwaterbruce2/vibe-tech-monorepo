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
} from '@vibetech/memory';
import { handleCognitiveMemory } from './handlers-cognitive.js';
import { handleCoreMemory } from './handlers-core.js';
import { handleIntegrations } from './handlers-integrations.js';
import { handleLearning } from './handlers-learning.js';
import { handleUnifiedSearch } from './handlers-unified.js';

export interface SummarizationDeps {
  summarizer: HierarchicalSummarizer | null;
  decay: MemoryDecay | null;
  llm: LlmSummarizer | null;
}

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  memoryManager: MemoryManager,
  analyzer: PatternAnalyzer | null,
  exporter: MarkdownExporter | null,
  consolidator: MemoryConsolidator | null,
  cryptoMemory: CryptoMemory | null,
  gitMemory: GitMemory | null,
  novaMemory: NovaMemory | null,
  learningBridge: LearningBridge | null,
  summarizationDeps: SummarizationDeps,
): Promise<CallToolResult | null> {
  const core = await handleCoreMemory(name, args, memoryManager, analyzer, exporter, consolidator);
  if (core) return core;
  const integrations = await handleIntegrations(name, args, cryptoMemory, gitMemory, novaMemory);
  if (integrations) return integrations;
  const learning = await handleLearning(
    name, args, learningBridge, summarizationDeps, memoryManager, novaMemory,
  );
  if (learning) return learning;
  const cognitive = await handleCognitiveMemory(name, args, memoryManager);
  if (cognitive) return cognitive;
  return handleUnifiedSearch(name, args, memoryManager, learningBridge);
}

/**
 * Handle MCP tool calls — dispatches to domain-specific handler modules
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
    const result = await dispatchTool(
      name,
      args as Record<string, unknown>,
      memoryManager,
      analyzer,
      exporter,
      consolidator,
      cryptoMemory,
      gitMemory,
      novaMemory,
      learningBridge,
      summarizationDeps,
    );
    return result ?? {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          tool: name,
        }),
      }],
      isError: true,
    };
  }
}
