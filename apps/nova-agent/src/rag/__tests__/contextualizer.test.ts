import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Contextualizer } from '../contextualizer.js';
import { RAGIndexer } from '../indexer.js';
import { DEFAULT_RAG_CONFIG } from '../types.js';
import type { Chunk, RAGConfig } from '../types.js';

const baseChunk = (overrides: Partial<Chunk> = {}): Chunk => ({
  id: 'chunk-1',
  filePath: 'src/example.ts',
  content: 'export function add(a: number, b: number) { return a + b; }',
  type: 'function',
  startLine: 1,
  endLine: 1,
  language: 'typescript',
  tokenCount: 12,
  createdAt: 0,
  ...overrides,
});

const ctxConfig = (overrides: Partial<RAGConfig> = {}): RAGConfig => ({
  ...DEFAULT_RAG_CONFIG,
  embeddingEndpoint: 'http://localhost:9999',
  contextualChunkingEnabled: true,
  contextualChunkingModel: 'anthropic/claude-haiku-4.5',
  contextualChunkingMaxTokens: 120,
  contextualChunkingMaxDocumentBytes: 60_000,
  ...overrides,
});

const mockChatResponse = (text: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
      usage: {
        prompt_tokens: 1500,
        completion_tokens: 30,
        prompt_tokens_details: { cached_tokens: 1400 },
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

describe('Contextualizer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches a contextPrefix to each chunk and marks them contextual', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(mockChatResponse('Situated prefix.')),
    );
    vi.stubGlobal('fetch', fetchMock);

    const ctx = new Contextualizer(ctxConfig());
    const chunks = [baseChunk(), baseChunk({ id: 'chunk-2', content: 'function sub() {}' })];
    const result = await ctx.contextualizeFile(
      'src/example.ts',
      'export function add() {}\nfunction sub() {}',
      chunks,
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.contextPrefix).toBe('Situated prefix.');
    expect(result[0]?.contextual).toBe(true);
    expect(result[1]?.contextual).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT modify the original chunk.content (display field stays raw)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(mockChatResponse('Prefix from doc.'))),
    );

    const ctx = new Contextualizer(ctxConfig());
    const original = baseChunk();
    const originalContent = original.content;
    const [out] = await ctx.contextualizeFile('src/example.ts', 'whole document', [original]);

    expect(out?.content).toBe(originalContent);
    expect(original.content).toBe(originalContent); // input not mutated
  });

  it('buildEmbeddingText prepends prefix only when present', () => {
    const raw = baseChunk();
    expect(Contextualizer.buildEmbeddingText(raw)).toBe(raw.content);

    const enriched: Chunk = { ...raw, contextPrefix: 'Hello ctx.', contextual: true };
    const built = Contextualizer.buildEmbeddingText(enriched);
    expect(built.startsWith('Hello ctx.\n\n')).toBe(true);
    expect(built.endsWith(raw.content)).toBe(true);
  });

  it('sends the prompt with cache_control ephemeral on the document block', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(mockChatResponse('Ctx.')));
    vi.stubGlobal('fetch', fetchMock);

    const ctx = new Contextualizer(ctxConfig());
    await ctx.contextualizeFile('src/example.ts', 'whole doc body', [baseChunk()]);

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe('anthropic/claude-haiku-4.5');
    expect(body.messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.messages[0].content[0].text).toContain('<document>');
    expect(body.messages[0].content[1].text).toContain('<chunk>');
  });

  it('falls back to contextual=false on API failure (no throw)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 500 })),
    );

    const ctx = new Contextualizer(ctxConfig());
    const chunks = [baseChunk()];
    const out = await ctx.contextualizeFile('src/example.ts', 'doc', chunks);

    expect(out).toHaveLength(1);
    expect(out[0]?.contextual).toBe(false);
    expect(out[0]?.contextPrefix).toBeUndefined();
    expect(ctx.getStats().failures).toBe(1);
  });

  it('tracks token usage stats including cached tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(mockChatResponse('Ctx.'))),
    );

    const ctx = new Contextualizer(ctxConfig());
    await ctx.contextualizeFile('src/example.ts', 'doc', [baseChunk(), baseChunk({ id: 'c2' })]);

    const stats = ctx.getStats();
    expect(stats.documentsProcessed).toBe(1);
    expect(stats.chunksProcessed).toBe(2);
    expect(stats.apiCalls).toBe(2);
    expect(stats.promptTokens).toBe(3000);
    expect(stats.cachedPromptTokens).toBe(2800);
    expect(stats.completionTokens).toBe(60);
  });
});

describe('RAGIndexer contextual chunking wiring', () => {
  it('does not construct a Contextualizer when disabled (default)', () => {
    const indexer = new RAGIndexer({ ...DEFAULT_RAG_CONFIG, contextualChunkingEnabled: false });
    // Reach into the private field via index access — we only assert the
    // observable wiring contract: no contextualizer means no LLM calls.
    const internal = indexer as unknown as { contextualizer: Contextualizer | null };
    expect(internal.contextualizer).toBeNull();
  });

  it('constructs a Contextualizer when enabled', () => {
    const indexer = new RAGIndexer({ ...DEFAULT_RAG_CONFIG, contextualChunkingEnabled: true });
    const internal = indexer as unknown as { contextualizer: Contextualizer | null };
    expect(internal.contextualizer).not.toBeNull();
  });

  it('embedding text is unchanged when contextualChunking is off', () => {
    const chunk = baseChunk();
    expect(Contextualizer.buildEmbeddingText(chunk)).toBe(chunk.content);
  });
});
