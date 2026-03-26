/**
 * Unified Search Fanout (Phase 3)
 * Embeds query once, fans out to all memory subsystems in parallel,
 * merges results with Reciprocal Rank Fusion (RRF), deduplicates by content hash.
 */
import { createHash } from 'node:crypto';
import type { MemoryManager } from '../core/MemoryManager.js';
import type { LearningBridge } from '../integrations/LearningBridge.js';
import type { UnifiedSearchOptions, UnifiedSearchResult, UnifiedSource } from './types.js';

export interface RAGBridgeAdapter {
  search(params: { query: string; limit?: number }): Promise<{
    results: Array<{
      filePath: string;
      content: string;
      score: number;
      language: string;
    }>;
  }>;
}

const RRF_K = 60;

export class UnifiedSearch {
  constructor(
    private manager: MemoryManager,
    private ragBridge: RAGBridgeAdapter | null = null,
    private learningBridge: LearningBridge | null = null,
  ) {}

  async search(query: string, options?: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    const limit = options?.limit ?? 10;
    const sources = new Set<UnifiedSource>(
      options?.sources ?? ['semantic', 'episodic', 'rag', 'learning'],
    );

    // Fan out to all enabled sources in parallel
    // Phase 5: fetch 3× candidates per source before RRF merge for better fusion quality
    const fanout = limit * 3;
    const promises: Array<Promise<UnifiedSearchResult[]>> = [];

    if (sources.has('semantic')) {
      promises.push(this.searchSemantic(query, fanout));
    }
    if (sources.has('episodic')) {
      promises.push(this.searchEpisodic(query, fanout, options?.timeRange));
    }
    if (sources.has('rag') && this.ragBridge) {
      promises.push(this.searchRAG(query, fanout));
    }
    if (sources.has('learning') && this.learningBridge) {
      promises.push(this.searchLearning(query, fanout));
    }

    const allResults = (await Promise.allSettled(promises))
      .filter((p): p is PromiseFulfilledResult<UnifiedSearchResult[]> => p.status === 'fulfilled')
      .flatMap((p) => p.value);

    // RRF merge: rank results per-source, then fuse scores
    const rrfScored = this.rrfFusion(allResults);

    // Deduplicate by content hash
    const seen = new Set<string>();
    const deduped = rrfScored.filter((r) => {
      const hash = createHash('md5').update(r.text.slice(0, 200)).digest('hex');
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });

    return deduped.slice(0, limit);
  }

  private rrfFusion(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    // Group by source to assign per-source ranks
    const bySource = new Map<UnifiedSource, UnifiedSearchResult[]>();
    for (const r of results) {
      const group = bySource.get(r.source) ?? [];
      group.push(r);
      bySource.set(r.source, group);
    }

    // Sort each source group by score descending and assign ranks
    const rankMap = new Map<UnifiedSearchResult, number[]>();
    for (const [, group] of bySource) {
      group.sort((a, b) => b.score - a.score);
      for (let i = 0; i < group.length; i++) {
        const ranks = rankMap.get(group[i]!) ?? [];
        ranks.push(i + 1); // 1-based rank
        rankMap.set(group[i]!, ranks);
      }
    }

    // Compute RRF score: sum(1 / (k + rank_i)) for each ranking
    const scored = results.map((r) => {
      const ranks = rankMap.get(r) ?? [results.length];
      const rrfScore = ranks.reduce((sum, rank) => sum + 1 / (RRF_K + rank), 0);
      return { ...r, score: rrfScore };
    });

    // Normalize to 0-1
    scored.sort((a, b) => b.score - a.score);
    const maxScore = scored[0]?.score ?? 1;
    for (const r of scored) {
      r.score = maxScore > 0 ? Math.round((r.score / maxScore) * 1000) / 1000 : 0;
    }

    return scored;
  }

  private async searchSemantic(query: string, limit: number): Promise<UnifiedSearchResult[]> {
    const results = await this.manager.semantic.search(query, limit);
    return results.map((r) => ({
      text: r.item.text,
      score: r.score,
      source: 'semantic' as const,
      sourceId: r.item.id?.toString(),
      metadata: { category: r.item.category, importance: r.item.importance },
      timestamp: r.item.created,
    }));
  }

  private async searchEpisodic(
    query: string,
    limit: number,
    timeRange?: { start: number; end: number },
  ): Promise<UnifiedSearchResult[]> {
    const results = this.manager.episodic.search(query, limit);
    let filtered = results;

    if (timeRange) {
      filtered = results.filter(
        (r) => r.item.timestamp >= timeRange.start && r.item.timestamp <= timeRange.end,
      );
    }

    return filtered.map((r) => ({
      text: `Q: ${r.item.query}\nA: ${r.item.response}`,
      score: r.score,
      source: 'episodic' as const,
      sourceId: r.item.id?.toString(),
      metadata: { sessionId: r.item.sessionId, sourceId: r.item.sourceId },
      timestamp: r.item.timestamp,
    }));
  }

  private async searchRAG(query: string, limit: number): Promise<UnifiedSearchResult[]> {
    if (!this.ragBridge) return [];
    try {
      const result = await this.ragBridge.search({ query, limit });
      return (result.results ?? []).map((r) => ({
        text: r.content,
        score: r.score,
        source: 'rag' as const,
        sourceId: r.filePath,
        metadata: { filePath: r.filePath, language: r.language },
      }));
    } catch {
      return [];
    }
  }

  private async searchLearning(query: string, limit: number): Promise<UnifiedSearchResult[]> {
    if (!this.learningBridge) return [];
    try {
      // Use getAgentContext to pull patterns from the learning system
      const ctx = this.learningBridge.getAgentContext('claude', limit);
      const queryLower = query.toLowerCase();
      return (ctx.knownPatterns ?? [])
        .filter((p) => p.description.toLowerCase().includes(queryLower) || p.type.toLowerCase().includes(queryLower))
        .slice(0, limit)
        .map((p) => ({
          text: `[${p.type}] ${p.description} (confidence: ${p.confidence}, freq: ${p.frequency})`,
          score: p.confidence,
          source: 'learning' as const,
          metadata: { patternType: p.type, frequency: p.frequency },
        }));
    } catch {
      return [];
    }
  }
}
