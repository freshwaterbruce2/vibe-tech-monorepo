/**
 * Reranker for RAG Pipeline
 * Implements Reciprocal Rank Fusion (RRF) to merge vector and FTS results.
 * Optionally applies cross-encoder reranking on top candidates.
 */

import type { RerankCandidate, RerankResult, SearchResult } from './types.js';

export class RAGReranker {
  private crossEncoderEndpoint: string | null;
  private rrfK: number;

  // To activate cross-encoder: deploy bge-reranker-v2-m3 (MIT, 278M params) as REST service,
  // set options.crossEncoderEndpoint to the service URL, and pass useCrossEncoder: true.
  // Recommended: BAAI/bge-reranker-v2-m3 (multilingual, state-of-the-art open-source reranker).
  // Expected latency: 50-100ms per query for top-10 candidates.
  constructor(options?: { crossEncoderEndpoint?: string; rrfK?: number }) {
    this.crossEncoderEndpoint = options?.crossEncoderEndpoint ?? null;
    this.rrfK = options?.rrfK ?? 60;
  }

  /**
   * Rerank candidates using RRF, optionally followed by cross-encoder
   */
  async rerank(
    candidates: RerankCandidate[],
    query: string,
    limit: number,
  ): Promise<RerankResult> {
    const start = Date.now();

    // Step 1: RRF score fusion
    const rrfScored = this.rrfFusion(candidates);

    // Step 2: Optional cross-encoder reranking on top candidates
    let method: RerankResult['method'] = 'rrf';
    let finalResults: SearchResult[];

    if (this.crossEncoderEndpoint && rrfScored.length > 0) {
      try {
        const topN = Math.min(10, rrfScored.length);
        const reranked = await this.crossEncoderRerank(
          rrfScored.slice(0, topN),
          query,
        );
        finalResults = [
          ...reranked,
          ...rrfScored.slice(topN),
        ].slice(0, limit);
        method = 'rrf+cross-encoder';
      } catch (error) {
        console.error('[RAGReranker] Cross-encoder failed, using RRF only:', (error as Error).message);
        finalResults = rrfScored.slice(0, limit);
      }
    } else {
      finalResults = rrfScored.slice(0, limit);
    }

    return {
      results: finalResults,
      method,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Reciprocal Rank Fusion
   * score = sum(1 / (k + rank_i)) for each ranking system
   *
   * Items appearing in both vector and FTS results get boosted.
   * Items appearing in only one get a lower score.
   */
  private rrfFusion(candidates: RerankCandidate[]): SearchResult[] {
    const scored: Array<SearchResult & { rrfScore: number }> = candidates.map((c) => {
      let rrfScore = 0;

      // Vector rank contribution
      if (c.vectorRank > 0) {
        rrfScore += 1 / (this.rrfK + c.vectorRank);
      }

      // FTS rank contribution
      if (c.ftsRank > 0) {
        rrfScore += 1 / (this.rrfK + c.ftsRank);
      }

      // Determine source label
      let source: SearchResult['source'] = 'hybrid';
      if (c.vectorRank > 0 && c.ftsRank === 0) source = 'vector';
      if (c.ftsRank > 0 && c.vectorRank === 0) source = 'fts';

      return {
        chunk: c.chunk,
        score: rrfScore,
        vectorScore: c.vectorScore,
        ftsScore: c.ftsScore,
        source,
        rrfScore,
      };
    });

    // Sort by RRF score descending
    scored.sort((a, b) => b.rrfScore - a.rrfScore);

    // Normalize scores to 0-1 range
    const maxScore = scored.length > 0 ? (scored[0]?.rrfScore ?? 1) : 1;
    return scored.map(({ rrfScore, ...rest }) => ({
      ...rest,
      score: maxScore > 0 ? rrfScore / maxScore : 0,
    }));
  }

  /**
   * Cross-encoder reranking via API
   * Sends (query, document) pairs to a cross-encoder model for relevance scoring.
   */
  private async crossEncoderRerank(
    candidates: SearchResult[],
    query: string,
  ): Promise<SearchResult[]> {
    if (!this.crossEncoderEndpoint) return candidates;

    const pairs = candidates.map((c) => ({
      query,
      document: c.chunk.content,
    }));

    const response = await fetch(this.crossEncoderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs }),
    });

    if (!response.ok) {
      throw new Error(`Cross-encoder API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      scores: number[];
    };

    // Apply cross-encoder scores
    const reranked = candidates.map((c, i) => ({
      ...c,
      score: data.scores[i] ?? c.score,
    }));

    // Sort by cross-encoder score
    reranked.sort((a, b) => b.score - a.score);
    return reranked;
  }
}
