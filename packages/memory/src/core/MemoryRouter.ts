/**
 * Memory Router
 * Automatically categorizes and routes incoming information to the
 * appropriate memory store (semantic, episodic, procedural, working).
 *
 * Decision logic:
 *  - Commands/workflows → Procedural
 *  - Events/interactions → Episodic
 *  - Knowledge/facts/insights → Semantic
 *  - Transient context → Working Memory
 *
 * Also provides unified cross-type search.
 */

import type { MemoryManager } from './MemoryManager.js';
import type { WorkingMemory } from '../stores/WorkingMemory.js';

export type MemoryType = 'semantic' | 'episodic' | 'procedural' | 'working';

export interface RouteDecision {
  type: MemoryType;
  confidence: number;
  reason: string;
}

export interface UnifiedSearchResult {
  type: MemoryType;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface MemoryRouterConfig {
  /** Keywords that signal procedural memory */
  proceduralKeywords?: string[];
  /** Keywords that signal episodic memory */
  episodicKeywords?: string[];
  /** Keywords that signal semantic memory */
  semanticKeywords?: string[];
  /** Default importance for auto-routed semantic memories */
  defaultImportance?: number;
}

const DEFAULT_PROCEDURAL_KEYWORDS = [
  'command', 'run', 'execute', 'workflow', 'step', 'script',
  'git', 'pnpm', 'npm', 'build', 'deploy', 'test',
  'how to', 'recipe', 'procedure', 'process',
];

const DEFAULT_EPISODIC_KEYWORDS = [
  'happened', 'did', 'error', 'fixed', 'deployed', 'changed',
  'session', 'conversation', 'asked', 'responded', 'tried',
  'today', 'yesterday', 'last time', 'earlier',
];

const DEFAULT_SEMANTIC_KEYWORDS = [
  'is', 'means', 'architecture', 'pattern', 'concept',
  'important', 'remember', 'insight', 'lesson', 'principle',
  'always', 'never', 'should', 'best practice',
];

export class MemoryRouter {
  private proceduralPatterns: RegExp[];
  private episodicPatterns: RegExp[];
  private semanticPatterns: RegExp[];
  private defaultImportance: number;

  constructor(config: MemoryRouterConfig = {}) {
    const procKeywords = config.proceduralKeywords ?? DEFAULT_PROCEDURAL_KEYWORDS;
    const epiKeywords = config.episodicKeywords ?? DEFAULT_EPISODIC_KEYWORDS;
    const semKeywords = config.semanticKeywords ?? DEFAULT_SEMANTIC_KEYWORDS;

    this.proceduralPatterns = procKeywords.map((k) => new RegExp(`\\b${k}\\b`, 'i'));
    this.episodicPatterns = epiKeywords.map((k) => new RegExp(`\\b${k}\\b`, 'i'));
    this.semanticPatterns = semKeywords.map((k) => new RegExp(`\\b${k}\\b`, 'i'));
    this.defaultImportance = config.defaultImportance ?? 5;
  }

  /**
   * Classify text into the most appropriate memory type
   */
  classify(text: string): RouteDecision {
    const scores: Record<MemoryType, number> = {
      semantic: 0,
      episodic: 0,
      procedural: 0,
      working: 0,
    };

    // Score each type based on keyword matches
    for (const p of this.proceduralPatterns) {
      if (p.test(text)) scores.procedural++;
    }
    for (const p of this.episodicPatterns) {
      if (p.test(text)) scores.episodic++;
    }
    for (const p of this.semanticPatterns) {
      if (p.test(text)) scores.semantic++;
    }

    // Short texts (< 50 chars) are likely working memory
    if (text.length < 50) {
      scores.working += 2;
    }

    // Find highest scoring type
    const entries = Object.entries(scores) as Array<[MemoryType, number]>;
    entries.sort((a, b) => b[1] - a[1]);

    const [bestType, bestScore] = entries[0];
    const totalScore = entries.reduce((sum, [, s]) => sum + s, 0);

    // If no keywords matched, default to semantic (general knowledge)
    if (totalScore === 0) {
      return {
        type: 'semantic',
        confidence: 0.5,
        reason: 'No keyword matches, defaulting to semantic',
      };
    }

    return {
      type: bestType,
      confidence: Math.min(bestScore / Math.max(totalScore, 1), 1),
      reason: `Matched ${bestScore} ${bestType} keywords out of ${totalScore} total`,
    };
  }

  /**
   * Auto-route and store text in the appropriate memory store
   */
  async route(
    text: string,
    manager: MemoryManager,
    workingMemory?: WorkingMemory,
    options?: {
      sourceId?: string;
      sessionId?: string;
      category?: string;
      importance?: number;
      forceType?: MemoryType;
    },
  ): Promise<{
    type: MemoryType;
    id?: number;
    decision: RouteDecision;
    semanticStatus?: 'inserted' | 'merged' | 'rejected_duplicate';
  }> {
    const decision = options?.forceType
      ? { type: options.forceType, confidence: 1, reason: 'Forced type' }
      : this.classify(text);

    switch (decision.type) {
      case 'semantic': {
        const result = await manager.semantic.add({
          text,
          category: options?.category,
          importance: options?.importance ?? this.defaultImportance,
        });
        if (result.status === 'rejected_duplicate') {
          return { type: 'semantic', decision, semanticStatus: result.status };
        }

        const id = result.status === 'inserted' ? result.id : result.existingId;
        return { type: 'semantic', id, decision, semanticStatus: result.status };
      }

      case 'episodic': {
        const id = manager.episodic.add({
          sourceId: options?.sourceId ?? 'memory-router',
          query: text,
          response: '',
          timestamp: Date.now(),
          sessionId: options?.sessionId,
        });
        return { type: 'episodic', id, decision };
      }

      case 'procedural': {
        manager.procedural.upsert({
          pattern: text,
          context: options?.category ?? 'auto-routed',
          successRate: 1.0,
          lastUsed: Date.now(),
        });
        return { type: 'procedural', decision };
      }

      case 'working': {
        if (workingMemory) {
          workingMemory.set(`auto:${Date.now()}`, text, {
            tags: options?.category ? [options.category] : ['auto-routed'],
          });
        }
        return { type: 'working', decision };
      }
    }
  }

  /**
   * Unified search across all memory types
   */
  async search(
    query: string,
    manager: MemoryManager,
    workingMemory?: WorkingMemory,
    options?: { limit?: number; types?: MemoryType[] },
  ): Promise<UnifiedSearchResult[]> {
    const limit = options?.limit ?? 10;
    const types = new Set(options?.types ?? ['semantic', 'episodic', 'procedural', 'working']);
    const results: UnifiedSearchResult[] = [];

    // Search semantic
    if (types.has('semantic')) {
      const semanticResults = await manager.semantic.search(query, limit);
      for (const r of semanticResults) {
        results.push({
          type: 'semantic',
          text: r.item.text,
          score: r.score,
          metadata: r.item.metadata as Record<string, unknown> | undefined,
          timestamp: r.item.created,
        });
      }
    }

    // Search episodic
    if (types.has('episodic')) {
      const episodicResults = manager.episodic.search(query, limit);
      for (const r of episodicResults) {
        results.push({
          type: 'episodic',
          text: `Q: ${r.item.query}\nA: ${r.item.response}`,
          score: r.score,
          timestamp: r.item.timestamp,
        });
      }
    }

    // Search procedural
    if (types.has('procedural')) {
      const patterns = manager.procedural.getMostFrequent(limit);
      const queryLower = query.toLowerCase();
      for (const p of patterns) {
        // Simple text matching for procedural
        const matchScore =
          p.pattern.toLowerCase().includes(queryLower) ||
          p.context.toLowerCase().includes(queryLower)
            ? 0.7
            : 0;
        if (matchScore > 0) {
          results.push({
            type: 'procedural',
            text: `${p.pattern} (${p.context})`,
            score: matchScore * p.successRate,
            metadata: { frequency: p.frequency, successRate: p.successRate },
            timestamp: p.lastUsed,
          });
        }
      }
    }

    // Search working memory
    if (types.has('working') && workingMemory) {
      const allItems = workingMemory.getAll();
      const queryLower = query.toLowerCase();
      for (const item of allItems) {
        const valueStr = typeof item.value === 'string' ? item.value : JSON.stringify(item.value);
        if (
          item.key.toLowerCase().includes(queryLower) ||
          valueStr.toLowerCase().includes(queryLower)
        ) {
          results.push({
            type: 'working',
            text: valueStr,
            score: 0.6,
            metadata: { key: item.key, tags: item.tags },
            timestamp: item.lastAccessed,
          });
        }
      }
    }

    // Sort by score descending, take limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}
