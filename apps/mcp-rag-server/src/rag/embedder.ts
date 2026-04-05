import type { EmbeddingBatchResult, EmbeddingResult, RAGConfig } from './types.js';

const MAX_BATCH_SIZE = 20;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
const RATE_LIMIT_DELAY_MS = 10_000;
const INTER_BATCH_DELAY_MS = 2000;

export class RAGEmbedder {
  private endpoint: string;
  private model: string;
  private totalCalls = 0;
  private totalTokens = 0;

  constructor(config: Pick<RAGConfig, 'embeddingEndpoint' | 'embeddingModel'>) {
    this.endpoint = config.embeddingEndpoint;
    this.model = config.embeddingModel;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const start = Date.now();
    const vectors = await this.callEmbeddingAPI([text]);
    const vec = vectors[0] ?? [];
    this.totalCalls++;
    return { vector: vec, dimension: vec.length, model: this.model, durationMs: Date.now() - start };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingBatchResult> {
    const start = Date.now();
    const allResults: EmbeddingResult[] = [];
    const failedIndices: number[] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      try {
        const vectors = await this.callEmbeddingAPI(batch);
        for (const vec of vectors) {
          const v = vec ?? [];
          allResults.push({ vector: v, dimension: v.length, model: this.model, durationMs: 0 });
        }
      } catch (error) {
        for (let j = 0; j < batch.length; j++) {
          failedIndices.push(i + j);
          allResults.push({ vector: [], dimension: 0, model: this.model, durationMs: 0 });
        }
        console.error(`[RAGEmbedder] Batch ${i}-${i + batch.length} failed:`, error);
      }
      this.totalCalls++;
      if (i + MAX_BATCH_SIZE < texts.length) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }
    return { results: allResults, totalDurationMs: Date.now() - start, failedIndices };
  }

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
            body: JSON.stringify({ model: this.model, input: inputs }),
            signal: controller.signal,
          });
        } finally { clearTimeout(timeoutId); }
        if (!response.ok) throw new Error(`Embedding API error ${response.status}: ${await response.text()}`);
        const data = await response.json() as { data: Array<{ embedding: number[]; index: number }>; usage?: { total_tokens: number } };
        if (data.usage) this.totalTokens += data.usage.total_tokens;
        return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
      } catch (error) {
        lastError = error as Error;
        if (attempt < MAX_RETRIES - 1) {
          const is429 = lastError.message.includes('429');
          const delay = is429 ? RATE_LIMIT_DELAY_MS * Math.pow(2, attempt) : RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw new Error(`Embedding API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
  }

  getStats() { return { totalCalls: this.totalCalls, totalTokens: this.totalTokens }; }
}
