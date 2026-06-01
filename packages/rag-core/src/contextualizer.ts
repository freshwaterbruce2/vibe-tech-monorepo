/**
 * Anthropic-style contextual chunking: per-chunk 50-100 token explanatory
 * prefix prepended to the embedding input only (chunk.content stays raw for
 * display); document block sent with cache_control: ephemeral so chunks 2..N
 * of the same file replay from the prompt cache. Opt-in via
 * RAGConfig.contextualChunkingEnabled (default false); existing indexed rows
 * are unaffected, only files (re)indexed after enabling get a contextPrefix.
 * Default model is anthropic/claude-haiku-4.5 (Haiku 3 retired 2026-04-19); at
 * $1/MTok input, $0.10/MTok cache-read, full re-index of ~264K chunks costs
 * roughly $5-15 USD assuming Anthropic's prompt-cache hit pattern (see
 * https://openrouter.ai/anthropic/claude-haiku-4.5). FTS gap: Anthropic's full
 * "Contextual BM25" also prepends the prefix to the keyword index; LanceDB FTS
 * here indexes the raw `content` column, which is a deliberate display
 * trade-off documented in indexer.ts. Reference:
 * https://www.anthropic.com/news/contextual-retrieval
 */

import type { Chunk, RAGConfig } from './types.js';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;

/** OpenRouter chat completions response shape (subset we read). */
interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

/** Tracks cumulative token usage so callers can estimate cost. */
export interface ContextualizerStats {
  documentsProcessed: number;
  chunksProcessed: number;
  promptTokens: number;
  cachedPromptTokens: number;
  completionTokens: number;
  apiCalls: number;
  failures: number;
}

export class Contextualizer {
  private endpoint: string;
  private model: string;
  private maxTokens: number;
  private maxDocumentBytes: number;
  private stats: ContextualizerStats = {
    documentsProcessed: 0,
    chunksProcessed: 0,
    promptTokens: 0,
    cachedPromptTokens: 0,
    completionTokens: 0,
    apiCalls: 0,
    failures: 0,
  };

  constructor(
    config: Pick<
      RAGConfig,
      | 'embeddingEndpoint'
      | 'contextualChunkingModel'
      | 'contextualChunkingMaxTokens'
      | 'contextualChunkingMaxDocumentBytes'
    >,
  ) {
    this.endpoint = config.embeddingEndpoint;
    this.model = config.contextualChunkingModel;
    this.maxTokens = config.contextualChunkingMaxTokens;
    this.maxDocumentBytes = config.contextualChunkingMaxDocumentBytes;
  }

  /**
   * Generate contextual prefixes for all chunks of a single file. The document
   * is sent once per chunk in the prompt body, but marked as `ephemeral` so
   * Anthropic's prompt cache returns it for the second and subsequent chunks
   * within the 5-minute TTL — dropping per-chunk input cost by ~90%.
   *
   * Returns the same chunks array with `contextPrefix` and `contextual: true`
   * populated. Failures fall back to `contextual: false` and no prefix — the
   * indexer continues to embed the raw chunk content.
   */
  async contextualizeFile(
    filePath: string,
    fullDocument: string,
    chunks: Chunk[],
  ): Promise<Chunk[]> {
    if (chunks.length === 0) return chunks;

    this.stats.documentsProcessed++;
    const documentForPrompt = this.truncateDocument(fullDocument);

    const out: Chunk[] = [];
    for (const chunk of chunks) {
      try {
        const prefix = await this.callApi(documentForPrompt, chunk.content);
        out.push({
          ...chunk,
          contextPrefix: prefix,
          contextual: true,
        });
        this.stats.chunksProcessed++;
      } catch (error) {
        this.stats.failures++;
        console.error(
          `[Contextualizer] Failed to generate prefix for ${filePath}#${chunk.id}: ${
            (error as Error).message
          }`,
        );
        // Preserve the chunk unchanged so the indexer can still embed raw content.
        out.push({ ...chunk, contextual: false });
      }
    }

    return out;
  }

  /**
   * Compose the text actually fed to the embedder. When a prefix is present,
   * it is prepended to the chunk content separated by a blank line. This is
   * the single point where the embedding input diverges from `chunk.content`.
   */
  static buildEmbeddingText(chunk: Chunk): string {
    if (chunk.contextPrefix && chunk.contextPrefix.length > 0) {
      return `${chunk.contextPrefix}\n\n${chunk.content}`;
    }
    return chunk.content;
  }

  getStats(): ContextualizerStats {
    return { ...this.stats };
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private truncateDocument(doc: string): string {
    if (Buffer.byteLength(doc, 'utf-8') <= this.maxDocumentBytes) return doc;
    // Head-truncate at byte boundary, then trim to last newline so we don't
    // cut a token in half.
    const buf = Buffer.from(doc, 'utf-8').subarray(0, this.maxDocumentBytes);
    const text = buf.toString('utf-8');
    const lastNewline = text.lastIndexOf('\n');
    return lastNewline > 0 ? text.slice(0, lastNewline) : text;
  }

  /**
   * POST to the OpenRouter proxy at /v1/chat/completions. The cached document
   * block goes in a separate content part with `cache_control: ephemeral`.
   * OpenRouter passes Anthropic prompt-cache markers through to upstream when
   * the model is Anthropic-family.
   */
  private async callApi(document: string, chunkContent: string): Promise<string> {
    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `<document>\n${document}\n</document>`,
              cache_control: { type: 'ephemeral' as const },
            },
            {
              type: 'text',
              text:
                'Here is the chunk we want to situate within the whole document:\n' +
                `<chunk>\n${chunkContent}\n</chunk>\n` +
                'Please give a short succinct context to situate this chunk within ' +
                'the overall document for the purposes of improving search retrieval ' +
                'of the chunk. Answer only with the succinct context and nothing else.',
            },
          ],
        },
      ],
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${this.endpoint}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Contextualizer API ${res.status}: ${errText.slice(0, 300)}`);
        }

        this.stats.apiCalls++;
        const data = (await res.json()) as ChatCompletionResponse;
        const usage = data.usage;
        if (usage) {
          this.stats.promptTokens += usage.prompt_tokens ?? 0;
          this.stats.completionTokens += usage.completion_tokens ?? 0;
          this.stats.cachedPromptTokens += usage.prompt_tokens_details?.cached_tokens ?? 0;
        }

        const content = data.choices[0]?.message?.content?.trim();
        if (!content) throw new Error('Contextualizer API returned empty content');
        return content;
      } catch (error) {
        lastError = error as Error;
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw new Error(
      `Contextualizer failed after ${MAX_RETRIES} attempts: ${lastError?.message ?? 'unknown'}`,
    );
  }
}
