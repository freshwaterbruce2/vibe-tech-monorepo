import type { RerankCandidate, RerankResult, SearchResult } from './types.js';

export class RAGReranker {
  private crossEncoderEndpoint: string | null;
  private rrfK: number;

  constructor(options?: { crossEncoderEndpoint?: string; rrfK?: number }) {
    this.crossEncoderEndpoint = options?.crossEncoderEndpoint ?? null;
    this.rrfK = options?.rrfK ?? 60;
  }

  async rerank(candidates: RerankCandidate[], query: string, limit: number): Promise<RerankResult> {
    const start = Date.now();
    const rrfScored = this.rrfFusion(candidates);
    let method: RerankResult['method'] = 'rrf';
    let finalResults: SearchResult[];

    if (this.crossEncoderEndpoint && rrfScored.length > 0) {
      try {
        const topN = Math.min(10, rrfScored.length);
        const reranked = await this.crossEncoderRerank(rrfScored.slice(0, topN), query);
        finalResults = [...reranked, ...rrfScored.slice(topN)].slice(0, limit);
        method = 'rrf+cross-encoder';
      } catch (error) {
        console.error('[RAGReranker] Cross-encoder failed, using RRF only:', (error as Error).message);
        finalResults = rrfScored.slice(0, limit);
      }
    } else {
      finalResults = rrfScored.slice(0, limit);
    }

    return { results: finalResults, method, durationMs: Date.now() - start };
  }

  private rrfFusion(candidates: RerankCandidate[]): SearchResult[] {
    const scored = candidates.map((c) => {
      let rrfScore = 0;
      if (c.vectorRank > 0) rrfScore += 1 / (this.rrfK + c.vectorRank);
      if (c.ftsRank > 0) rrfScore += 1 / (this.rrfK + c.ftsRank);
      let source: SearchResult['source'] = 'hybrid';
      if (c.vectorRank > 0 && c.ftsRank === 0) source = 'vector';
      if (c.ftsRank > 0 && c.vectorRank === 0) source = 'fts';
      return { chunk: c.chunk, score: rrfScore, vectorScore: c.vectorScore, ftsScore: c.ftsScore, source, rrfScore };
    });
    scored.sort((a, b) => b.rrfScore - a.rrfScore);
    const firstEntry = scored[0];
    const maxScore = firstEntry !== undefined ? firstEntry.rrfScore : 1;
    return scored.map(({ rrfScore, ...rest }) => ({ ...rest, score: maxScore > 0 ? rrfScore / maxScore : 0 }));
  }

  private async crossEncoderRerank(candidates: SearchResult[], query: string): Promise<SearchResult[]> {
    if (!this.crossEncoderEndpoint) return candidates;
    const response = await fetch(this.crossEncoderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs: candidates.map((c) => ({ query, document: c.chunk.content })) }),
    });
    if (!response.ok) throw new Error(`Cross-encoder API error: ${response.status}`);
    const data = await response.json() as { scores: number[] };
    const reranked = candidates.map((c, i) => ({ ...c, score: data.scores[i] ?? c.score }));
    reranked.sort((a, b) => b.score - a.score);
    return reranked;
  }
}
