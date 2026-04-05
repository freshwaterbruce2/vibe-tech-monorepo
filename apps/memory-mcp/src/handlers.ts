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
import { handleCoreMemory } from './handlers-core.js';
import { handleIntegrations } from './handlers-integrations.js';
import { handleLearning } from './handlers-learning.js';
import { handleUnifiedSearch } from './handlers-unified.js';

export interface SummarizationDeps {
  summarizer: HierarchicalSummarizer | null;
  decay: MemoryDecay | null;
  llm: LlmSummarizer | null;
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
    // 1. Core memory operations (search, add, track, health, consolidate, export)
    const coreResult = await handleCoreMemory(
      name, args as Record<string, unknown>,
      memoryManager, analyzer, exporter, consolidator,
    );
    if (coreResult) return coreResult;

    // 2. Integration handlers (crypto, git, nova context)
    const integrationResult = await handleIntegrations(
      name, args as Record<string, unknown>,
      cryptoMemory, gitMemory, novaMemory,
    );
    if (integrationResult) return integrationResult;

    // 3. Learning, RAG pipeline, summarization & decay
    const learningResult = await handleLearning(
      name, args as Record<string, unknown>,
      learningBridge, summarizationDeps, memoryManager, novaMemory,
    );
    if (learningResult) return learningResult;

    // 4. Unified search (fans out across all sources)
    const unifiedResult = await handleUnifiedSearch(
      name, args as Record<string, unknown>,
      memoryManager, learningBridge,
    );
    if (unifiedResult) return unifiedResult;

    // Unknown tool
    return {
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
