import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
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

export interface SummarizationDeps {
  summarizer: HierarchicalSummarizer | null;
  decay: MemoryDecay | null;
  llm: LlmSummarizer | null;
}

export type HandlerArgs = Record<string, unknown>;

export interface ConsolidationDeletion {
  deletedId: number;
  mergedIntoId: number;
  similarity: number;
  reason: string;
}

export interface CoreDeps {
  memoryManager: MemoryManager;
  analyzer: PatternAnalyzer | null;
  exporter: MarkdownExporter | null;
  consolidator: MemoryConsolidator | null;
}

export interface IntegrationDeps {
  cryptoMemory: CryptoMemory | null;
  gitMemory: GitMemory | null;
  novaMemory: NovaMemory | null;
}

export interface LearningDeps {
  learningBridge: LearningBridge | null;
  summarizationDeps: SummarizationDeps;
  novaMemory: NovaMemory | null;
  memoryManager: MemoryManager;
}

export type HandlerFn = (
  name: string,
  args: HandlerArgs,
) => Promise<CallToolResult | null>;
