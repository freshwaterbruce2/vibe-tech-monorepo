/**
 * Unified Search Fanout (Phase 3)
 * Embeds query once, fans out to all memory subsystems in parallel,
 * merges results with Reciprocal Rank Fusion (RRF), deduplicates by content hash.
 */
import { createHash } from 'node:crypto';
import {
  DEFAULT_EPISODIC_HALF_LIFE_MS,
  DEFAULT_SEMANTIC_HALF_LIFE_MS,
} from '../consolidation/MemoryDecay.js';
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

// Per-source half-lives reused from MemoryDecay. Sources without a meaningful
// timestamp (rag = file mtime is not freshness, learning/procedural = pattern stats)
// get null, which keeps factor 1.0 and preserves prior ranking for those sources.
const SOURCE_HALF_LIFE_MS: Record<UnifiedSource, number | null> = {
  episodic: DEFAULT_EPISODIC_HALF_LIFE_MS,
  semantic: DEFAULT_SEMANTIC_HALF_LIFE_MS,
  procedural: null,
  rag: null,
  learning: null,
};

function recencyFactor(result: UnifiedSearchResult, now: number): number {
  const halfLife = SOURCE_HALF_LIFE_MS[result.source];
  if (halfLife === null || result.timestamp === undefined) return 1;
  const ageMs = now - result.timestamp;
  if (ageMs <= 0) return 1; // future or simultaneous timestamp: no decay
  return Math.pow(2, -ageMs / halfLife);
}

// Rough English/code token estimator. ~4 chars/token is the OpenAI/Anthropic
// rule of thumb; precise tokenization would require a vendor tokenizer (tiktoken)
// which isn't worth the dependency for a budget cap that's already a soft hint.
const CHARS_PER_TOKEN = 4;
const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

export class UnifiedSearch {
  constructor(
    private manager: MemoryManager,
    private ragBridge: RAGBridgeAdapter | null = null,
    private learningBridge: LearningBridge | null = null,
  ) {}

  async search(query: string, options?: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    const limit = options?.limit ?? 10;
    const recencyBoostEnabled = options?.recencyBoost ?? true;
    const sources = new Set<UnifiedSource>(
      options?.sources ?? ['semantic', 'episodic', 'procedural', 'rag', 'learning'],
    );

    // Fan out to all enabled sources in parallel
    // Phase 5: fetch 3x candidates per source before RRF merge for better fusion quality
    const fanout = limit * 3;
    const promises: Array<Promise<UnifiedSearchResult[]>> = [];

    if (sources.has('semantic')) {
      promises.push(this.searchSemantic(query, fanout));
    }
    if (sources.has('episodic')) {
      promises.push(this.searchEpisodic(query, fanout, options?.timeRange));
    }
    if (sources.has('procedural') && this.learningBridge) {
      promises.push(this.searchProcedural(query, fanout));
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

    // Pipeline (audit #3 then #2): recency boost first so per-result scores
    // reflect age-decay, then token budget allocates by those adjusted scores
    // so the budget allocator picks the freshest-relevant rows per source.
    const boosted = recencyBoostEnabled ? this.applyRecencyBoost(allResults) : allResults;
    const budgeted = options?.tokenBudget
      ? this.applyTokenBudget(boosted, options.tokenBudget, options.sourceWeights, sources)
      : boosted;

    // RRF merge: rank results per-source, then fuse scores
    const rrfScored = this.rrfFusion(budgeted);

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

  private applyRecencyBoost(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    const now = Date.now();
    return results.map((r) => ({ ...r, score: r.score * recencyFactor(r, now) }));
  }

  private applyTokenBudget(
    results: UnifiedSearchResult[],
    tokenBudget: number,
    sourceWeights: Partial<Record<UnifiedSource, number>> | undefined,
    enabledSources: Set<UnifiedSource>,
  ): UnifiedSearchResult[] {
    // Group by source
    const bySource = new Map<UnifiedSource, UnifiedSearchResult[]>();
    for (const r of results) {
      const group = bySource.get(r.source) ?? [];
      group.push(r);
      bySource.set(r.source, group);
    }

    // Allocate budget proportionally across enabled sources that actually returned
    // something. Sources that returned zero results don't get a budget slice
    // (their share redistributes to active sources).
    const activeSources = [...enabledSources].filter((s) => (bySource.get(s)?.length ?? 0) > 0);
    if (activeSources.length === 0) return results;

    const weightFor = (s: UnifiedSource): number => sourceWeights?.[s] ?? 1;
    const totalWeight = activeSources.reduce((sum, s) => sum + weightFor(s), 0);

    const kept: UnifiedSearchResult[] = [];
    for (const source of activeSources) {
      const slice = Math.floor(tokenBudget * (weightFor(source) / totalWeight));
      if (slice <= 0) continue;
      const sourceResults = (bySource.get(source) ?? [])
        .slice()
        .sort((a, b) => b.score - a.score);

      let used = 0;
      for (const r of sourceResults) {
        const cost = estimateTokens(r.text);
        if (used + cost > slice && kept.some((k) => k.source === source)) {
          // Stop adding this source once its slice is exhausted (but always keep
          // at least one result per active source so a tiny budget doesn't drop
          // a whole source).
          break;
        }
        kept.push(r);
        used += cost;
      }
    }
    return kept;
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
        const result = group[i];
        if (!result) continue; // unreachable: bounded by group.length
        const ranks = rankMap.get(result) ?? [];
        ranks.push(i + 1); // 1-based rank
        rankMap.set(result, ranks);
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

  private async searchProcedural(query: string, limit: number): Promise<UnifiedSearchResult[]> {
    if (!this.learningBridge) return [];
    try {
      const hits = await this.learningBridge.searchProceduralPatterns(query, limit);
      return hits.map((h) => ({
        text: h.text,
        score: h.score,
        source: 'procedural' as const,
        sourceId: h.id,
        metadata: {
          patternType: h.patternType,
          patternSource: h.source,
          frequency: h.frequency,
          successRate: h.successRate,
          similarity: h.similarity,
          lastUsed: h.lastUsed,
        },
      }));
    } catch {
      // Embedder unavailable or query embed failed — degrade gracefully
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
