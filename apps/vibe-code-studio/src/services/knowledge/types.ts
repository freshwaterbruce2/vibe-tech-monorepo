/**
 * Knowledge Items types — spec 04 Phase 1. Durable prose facts the agent
 * loads by relevance at session start; a parallel memory tier to
 * StrategyMemory's action patterns (which stay untouched).
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */

export interface KnowledgeItem {
  id: string;
  title: string;
  /** Markdown body. */
  content: string;
  /** Free-form grouping shown in the panel filter (e.g. 'architecture'). */
  category: string;
  /** Glob patterns scoping the item to files, empty = workspace-wide. */
  scopeGlobs: string[];
  /** Traceability: session/task that produced the item ('manual' for hand-added). */
  sourceSessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDraft {
  title: string;
  content: string;
  category?: string;
  scopeGlobs?: string[];
  sourceSessionId?: string;
}

export const KNOWLEDGE_CATEGORY_DEFAULT = 'general';

/** Max characters of knowledge injected into a prompt (AC #10 token cap). */
export const KNOWLEDGE_INJECTION_CHAR_BUDGET = 4000;

/** Top-N items injected at session start. */
export const KNOWLEDGE_INJECTION_TOP_N = 3;
