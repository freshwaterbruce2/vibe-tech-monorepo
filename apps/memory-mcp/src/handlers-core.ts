import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  MemoryManager,
  PatternAnalyzer,
  MarkdownExporter,
  MemoryConsolidator,
} from '@vibetech/memory';
import type { HandlerArgs } from './handler-types.js';
import {
  handleAddEpisodic,
  handleAddSemantic,
  handleAnalyzePattern,
  handleConflictCheck,
  handleConsolidate,
  handleConsolidatePreview,
  handleExport,
  handleGetPatterns,
  handleGetRecent,
  handleGetSession,
  handleHealth,
  handleSearchEpisodic,
  handleSearchSemantic,
  handleSearchTimeRange,
  handleSuggest,
  handleTrackPattern,
} from './handlers-core.helpers.js';

export async function handleCoreMemory(
  name: string,
  args: HandlerArgs,
  memoryManager: MemoryManager,
  analyzer: PatternAnalyzer | null,
  exporter: MarkdownExporter | null,
  consolidator: MemoryConsolidator | null,
): Promise<CallToolResult | null> {
  switch (name) {
    case 'memory_search_semantic': return handleSearchSemantic(args, memoryManager);
    case 'memory_search_episodic': return handleSearchEpisodic(args, memoryManager);
    case 'memory_get_recent': return handleGetRecent(args, memoryManager);
    case 'memory_add_semantic': return handleAddSemantic(args, memoryManager);
    case 'memory_add_episodic': return handleAddEpisodic(args, memoryManager);
    case 'memory_track_pattern': return handleTrackPattern(args, memoryManager);
    case 'memory_get_patterns': return handleGetPatterns(args, memoryManager);
    case 'memory_health': return handleHealth(args, memoryManager);
    case 'memory_get_session': return handleGetSession(args, memoryManager);
    case 'memory_search_timerange': return handleSearchTimeRange(args, memoryManager);
    case 'memory_suggest': return handleSuggest(args, analyzer);
    case 'memory_export': return handleExport(args, exporter);
    case 'memory_analyze_pattern': return handleAnalyzePattern(args, analyzer);
    case 'memory_consolidate': return handleConsolidate(args, consolidator);
    case 'memory_consolidate_preview': return handleConsolidatePreview(args, consolidator);
    case 'memory_conflict_check': return handleConflictCheck(args, memoryManager);
    default: return null;
  }
}
