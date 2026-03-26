/**
 * Hybrid Retriever for RAG Pipeline
 * Combines vector similarity search and full-text search from LanceDB,
 * then merges results for reranking.
 */

import type { Table } from '@lancedb/lancedb';
import { RAGEmbedder } from './embedder.js';
import type { Chunk, RerankCandidate, SearchQuery, SearchResult, RAGConfig } from './types.js';

const DEFAULT_LIMIT = 5;

export class RAGRetriever {
  private embedder: RAGEmbedder;
  private searchPoolSize: number;
  private hydeEnabled: boolean;
  private hydeModel: string;
  private hydeEndpoint: string;

  constructor(
    config: Pick<RAGConfig, 'embeddingEndpoint' | 'embeddingModel'> & {
      searchPoolSize?: number;
      hydeEnabled?: boolean;
      hydeModel?: string;
    },
  ) {
    this.embedder = new RAGEmbedder(config);
    this.searchPoolSize = config.searchPoolSize ?? 50; // Phase 5: two-stage pool (up from 20)
    this.hydeEnabled = config.hydeEnabled ?? false;
    this.hydeModel = config.hydeModel ?? 'openai/gpt-4o-mini';
    this.hydeEndpoint = config.embeddingEndpoint; // same proxy host
  }

  /**
   * Perform hybrid search: vector + FTS, return merged candidates for reranking.
   * Phase 5: if hydeEnabled, expands query with a hypothetical document and averages
   * the two embeddings before the vector search for improved recall on vague queries.
   */
  async search(table: Table, query: SearchQuery): Promise<RerankCandidate[]> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const poolSize = Math.max(this.searchPoolSize, limit * 4);

    // Phase 5: HyDE query expansion — average query vector + hypothetical doc vector
    let precomputedVector: number[] | undefined;
    if (this.hydeEnabled) {
      try {
        const hypothetical = await this.expandQueryHyDE(query.text);
        const [origEmb, hydeEmb] = await Promise.all([
          this.embedder.embed(query.text),
          this.embedder.embed(hypothetical),
        ]);
        precomputedVector = origEmb.vector.map((v, i) => (v + (hydeEmb.vector[i] ?? 0)) / 2);
      } catch {
        // HyDE failure is non-fatal — fall through to standard vector search
      }
    }

    // Run vector and FTS searches in parallel (FTS always uses original text)
    const [vectorResults, ftsResults] = await Promise.all([
      this.vectorSearch(table, query.text, poolSize, precomputedVector),
      this.ftsSearch(table, query.text, poolSize),
    ]);

    // Merge into rerank candidates
    const candidateMap = new Map<string, RerankCandidate>();

    for (let i = 0; i < vectorResults.length; i++) {
      const row = vectorResults[i];
      const chunk = rowToChunk(row);
      candidateMap.set(chunk.id, {
        chunk,
        vectorRank: i + 1,
        ftsRank: 0, // Will be filled if also in FTS results
        vectorScore: row._distance != null ? 1 / (1 + row._distance) : 0,
        ftsScore: 0,
      });
    }

    for (let i = 0; i < ftsResults.length; i++) {
      const row = ftsResults[i];
      const chunk = rowToChunk(row);
      const existing = candidateMap.get(chunk.id);

      if (existing) {
        existing.ftsRank = i + 1;
        existing.ftsScore = row._score ?? 0;
      } else {
        candidateMap.set(chunk.id, {
          chunk,
          vectorRank: 0,
          ftsRank: i + 1,
          vectorScore: 0,
          ftsScore: row._score ?? 0,
        });
      }
    }

    let candidates = Array.from(candidateMap.values());

    // Apply metadata filters
    candidates = this.applyFilters(candidates, query);

    return candidates;
  }

  /**
   * Simple vector-only search (for quick lookups)
   */
  async vectorSearchOnly(table: Table, queryText: string, limit: number): Promise<SearchResult[]> {
    const rows = await this.vectorSearch(table, queryText, limit);
    return rows.map((row, i) => ({
      chunk: rowToChunk(row),
      score: row._distance != null ? 1 / (1 + row._distance) : 0,
      vectorScore: row._distance != null ? 1 / (1 + row._distance) : 0,
      ftsScore: 0,
      source: 'vector' as const,
    }));
  }

  // ─── Private ────────────────────────────────────────────────────────────

  /**
   * Phase 5: Generate a hypothetical document that would answer the query.
   * The hypothetical doc embedding is averaged with the query embedding for
   * better recall on queries whose phrasing doesn't match document phrasing.
   */
  private async expandQueryHyDE(query: string): Promise<string> {
    const response = await fetch(`${this.hydeEndpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.hydeModel,
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content:
              'You are a code search assistant. Write a brief, realistic code snippet or function that directly implements or answers the user query. Output only the code, no explanations.',
          },
          { role: 'user', content: query },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`HyDE request failed: ${response.status}`);

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? query;
  }

  private async vectorSearch(
    table: Table,
    queryText: string,
    limit: number,
    precomputedVector?: number[],
  ): Promise<any[]> {
    try {
      const vector =
        precomputedVector ?? (await this.embedder.embed(queryText)).vector;

      const results = await table
        .search(vector)
        .limit(limit)
        .toArray();

      return results;
    } catch (error) {
      console.error('[RAGRetriever] Vector search failed:', (error as Error).message);
      return [];
    }
  }

  private async ftsSearch(table: Table, queryText: string, limit: number): Promise<any[]> {
    try {
      // LanceDB full-text search
      const results = await table
        .search(queryText, 'content')
        .limit(limit)
        .toArray();

      return results;
    } catch (error) {
      // FTS might not be available on all LanceDB setups
      console.error('[RAGRetriever] FTS search failed (falling back to vector only):', (error as Error).message);
      return [];
    }
  }

  private applyFilters(candidates: RerankCandidate[], query: SearchQuery): RerankCandidate[] {
    let filtered = candidates;

    if (query.fileTypes && query.fileTypes.length > 0) {
      const types = new Set(query.fileTypes);
      filtered = filtered.filter((c) => {
        const ext = '.' + c.chunk.filePath.split('.').pop();
        return types.has(ext);
      });
    }

    if (query.pathPrefix) {
      const prefix = query.pathPrefix;
      filtered = filtered.filter((c) => c.chunk.filePath.startsWith(prefix));
    }

    if (query.chunkTypes && query.chunkTypes.length > 0) {
      const types = new Set(query.chunkTypes);
      filtered = filtered.filter((c) => types.has(c.chunk.type));
    }

    return filtered;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function rowToChunk(row: any): Chunk {
  return {
    id: row.id,
    filePath: row.filePath,
    content: row.content,
    type: row.type,
    startLine: row.startLine,
    endLine: row.endLine,
    symbolName: row.symbolName || undefined,
    language: row.language,
    tokenCount: row.tokenCount,
    createdAt: row.createdAt,
  };
}
