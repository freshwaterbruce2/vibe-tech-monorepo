/**
 * Embedding Service for RAG Pipeline
 * Uses OpenRouter API via localhost:3001 proxy for text-embedding-3-small.
 * Supports batch embedding with retry and rate limiting.
 */

import type { EmbeddingBatchResult, EmbeddingResult, RAGConfig } from './types.js';

const MAX_BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class RAGEmbedder {
  private endpoint: string;
  private model: string;
  private totalCalls = 0;
  private totalTokens = 0;

  constructor(config: Pick<RAGConfig, 'embeddingEndpoint' | 'embeddingModel'>) {
    this.endpoint = config.embeddingEndpoint;
    this.model = config.embeddingModel;
  }

  /**
   * Embed a single text string
   */
  async embed(text: string): Promise<EmbeddingResult> {
    const start = Date.now();
    const vectors = await this.callEmbeddingAPI([text]);
    const vec = vectors[0] ?? [];

    this.totalCalls++;
    return {
      vector: vec,
      dimension: vec.length,
      model: this.model,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Embed multiple texts in batches
   */
  async embedBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    const start = Date.now();
    const allResults: EmbeddingResult[] = [];
    const failedIndices: number[] = [];

    // Process in batches of MAX_BATCH_SIZE
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);

      try {
        const vectors = await this.callEmbeddingAPI(batch);

        for (let j = 0; j < vectors.length; j++) {
          const vec = vectors[j] ?? [];
          allResults.push({
            vector: vec,
            dimension: vec.length,
            model: this.model,
            durationMs: 0, // batch timing not per-item
          });
        }
      } catch (error) {
        // Mark all items in failed batch
        for (let j = 0; j < batch.length; j++) {
          failedIndices.push(i + j);
          allResults.push({
            vector: [],
            dimension: 0,
            model: this.model,
            durationMs: 0,
          });
        }
        console.error(`[RAGEmbedder] Batch ${i}-${i + batch.length} failed:`, error);
      }

      this.totalCalls++;
    }

    return {
      results: allResults,
      totalDurationMs: Date.now() - start,
      failedIndices,
    };
  }

  /**
   * Call the OpenRouter embedding API via proxy with retry
   */
  private async callEmbeddingAPI(inputs: string[]): Promise<number[][]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);
        let response: Response;
        try {
          response = await fetch(`${this.endpoint}/api/v1/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.model,
              input: inputs,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embedding API error ${response.status}: ${errorText}`);
        }

        const data = (await response.json()) as {
          data: Array<{ embedding: number[]; index: number }>;
          usage?: { total_tokens: number };
        };

        if (data.usage) {
          this.totalTokens += data.usage.total_tokens;
        }

        // Sort by index to preserve order
        const sorted = data.data.sort((a, b) => a.index - b.index);
        return sorted.map((d) => d.embedding);
      } catch (error) {
        lastError = error as Error;

        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.error(
            `[RAGEmbedder] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
            (error as Error).message,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Embedding API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
  }

  /**
   * Get usage statistics
   */
  getStats(): { totalCalls: number; totalTokens: number } {
    return { totalCalls: this.totalCalls, totalTokens: this.totalTokens };
  }
}
