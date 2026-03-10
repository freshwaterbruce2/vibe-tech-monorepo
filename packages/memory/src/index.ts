// Core memory system exports
export { MemoryManager } from './core/MemoryManager.js';
export { DatabaseManager } from './database/DatabaseManager.js';
export { EmbeddingService } from './embeddings/EmbeddingService.js';

// Store exports
export { EpisodicStore } from './stores/EpisodicStore.js';
export { ProceduralStore } from './stores/ProceduralStore.js';
export { SemanticStore } from './stores/SemanticStore.js';

// Hook exports
export { AutoCapture } from './hooks/AutoCapture.js';
export type { CaptureConfig } from './hooks/AutoCapture.js';

// Analysis exports
export { PatternAnalyzer } from './analysis/PatternAnalyzer.js';
export type { PatternInsight, Suggestion } from './analysis/PatternAnalyzer.js';

// Export exports
export { MarkdownExporter } from './export/MarkdownExporter.js';
export type { ExportOptions } from './export/MarkdownExporter.js';

// Consolidation exports
export { HierarchicalSummarizer } from './consolidation/HierarchicalSummarizer.js';
export type {
  SummarizationResult,
  SummarizerConfig,
  SummaryLevel,
} from './consolidation/HierarchicalSummarizer.js';
export { LlmSummarizer, createLlmSummarizerFromEnv } from './consolidation/LlmSummarizer.js';
export type {
  LlmSummarizerConfig,
  SummarizeRequest,
  SummarizeResult,
} from './consolidation/LlmSummarizer.js';
export { MemoryConsolidator } from './consolidation/MemoryConsolidator.js';
export type {
  ConsolidationOptions,
  ConsolidationResult,
} from './consolidation/MemoryConsolidator.js';
export { MemoryDecay } from './consolidation/MemoryDecay.js';
export type { DecayConfig, DecayResult, DecayScore } from './consolidation/MemoryDecay.js';

// Integration exports
export { CryptoMemory } from './integrations/CryptoMemory.js';
export type { MarketAnalysis, TradeDecision, TradingPattern } from './integrations/CryptoMemory.js';
export { GitMemory } from './integrations/GitMemory.js';
export type { CommitInfo, GitWorkflow } from './integrations/GitMemory.js';
export { LearningBridge } from './integrations/LearningBridge.js';
export type { AgentContext, SyncResult } from './integrations/LearningBridge.js';
export { NovaMemory } from './integrations/NovaMemory.js';
export type { FileReference, ProjectContext, TaskInfo } from './integrations/NovaMemory.js';

// Type exports
export type {
  EpisodicMemory,
  MemoryConfig,
  ProceduralMemory,
  SearchResult,
  SemanticMemory,
} from './types/index.js';
