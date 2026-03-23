import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmSummarizer, createLlmSummarizerFromEnv } from '../consolidation/LlmSummarizer.js';

// ── Helpers ─────────────────────────────────────────────────

function mockFetchSuccess(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () =>
      Promise.resolve({
        choices: [{ message: { content } }],
      }),
  }) as unknown as typeof globalThis.fetch;
}

function mockFetchFailure(status = 500) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: 'Internal Server Error',
    json: async () => Promise.resolve({}),
  }) as unknown as typeof globalThis.fetch;
}

// ── Tests ───────────────────────────────────────────────────

describe('LlmSummarizer', () => {
  const config = {
    apiUrl: 'http://localhost:3000/v1/chat/completions',
    model: 'test-model',
    apiKey: 'test-key',
    timeoutMs: 5000,
  };

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should return extractive result for empty texts', async () => {
    const llm = new LlmSummarizer(config);
    const result = await llm.summarize({ texts: [] });

    expect(result.source).toBe('extractive');
    expect(result.summary).toBe('');
  });

  it('should call LLM and return result on success', async () => {
    globalThis.fetch = mockFetchSuccess('LLM generated summary');
    const llm = new LlmSummarizer(config);

    const result = await llm.summarize({
      texts: ['Q: How do I test?\nA: Use vitest.'],
      level: 'session',
    });

    expect(result.source).toBe('llm');
    expect(result.summary).toBe('LLM generated summary');
    expect(result.model).toBe('test-model');
  });

  it('should send correct request body', async () => {
    const fetchMock = mockFetchSuccess('ok');
    globalThis.fetch = fetchMock;
    const llm = new LlmSummarizer(config);

    await llm.summarize({ texts: ['text1', 'text2'], level: 'topic' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = (fetchMock as any).mock.calls[0];
    expect(url).toBe(config.apiUrl);
    const body = JSON.parse(opts.body as string);
    expect(body.model).toBe('test-model');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toContain('text1');
    expect(body.messages[1].content).toContain('text2');
  });

  it('should include Authorization header when apiKey provided', async () => {
    const fetchMock = mockFetchSuccess('ok');
    globalThis.fetch = fetchMock;
    const llm = new LlmSummarizer(config);

    await llm.summarize({ texts: ['hello'] });

    const [, opts] = (fetchMock as any).mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer test-key');
  });

  it('should omit Authorization header when no apiKey', async () => {
    const fetchMock = mockFetchSuccess('ok');
    globalThis.fetch = fetchMock;
    const llm = new LlmSummarizer({ ...config, apiKey: undefined });

    await llm.summarize({ texts: ['hello'] });

    const [, opts] = (fetchMock as any).mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('should fallback to extractive on HTTP error', async () => {
    globalThis.fetch = mockFetchFailure(500);
    const llm = new LlmSummarizer(config);

    const result = await llm.summarize({
      texts: ['This is a long enough sentence to pass the filter for extractive fallback testing.'],
    });

    expect(result.source).toBe('extractive');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should fallback to extractive on fetch rejection', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const llm = new LlmSummarizer(config);

    const result = await llm.summarize({
      texts: ['This is a long enough sentence to pass the filter for extractive fallback testing.'],
    });

    expect(result.source).toBe('extractive');
  });

  it('should fallback when LLM returns empty content', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => Promise.resolve({ choices: [{ message: { content: '' } }] }),
    });
    const llm = new LlmSummarizer(config);

    const result = await llm.summarize({
      texts: ['This is a long enough sentence to pass the filter for extractive fallback testing.'],
    });

    expect(result.source).toBe('extractive');
  });

  it('should use correct prompt for each level', async () => {
    const fetchMock = mockFetchSuccess('ok');
    globalThis.fetch = fetchMock;
    const llm = new LlmSummarizer(config);

    await llm.summarize({ texts: ['x'], level: 'domain' });

    const body = JSON.parse((fetchMock as any).mock.calls[0][1].body as string);
    expect(body.messages[0].content).toContain('knowledge architect');
  });

  it('createSyncFallback should return extractive function', () => {
    const llm = new LlmSummarizer(config);
    const fn = llm.createSyncFallback();

    const result = fn([
      'Short.',
      'Also short.',
      'This is a sufficiently long sentence that passes the extractive filter for sure.',
    ]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('createLlmSummarizerFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null when LLM_API_URL missing', () => {
    delete process.env.LLM_API_URL;
    process.env.LLM_MODEL = 'test';
    expect(createLlmSummarizerFromEnv()).toBeNull();
  });

  it('should return null when LLM_MODEL missing', () => {
    process.env.LLM_API_URL = 'http://localhost:3000';
    delete process.env.LLM_MODEL;
    expect(createLlmSummarizerFromEnv()).toBeNull();
  });

  it('should return LlmSummarizer when both env vars set', () => {
    process.env.LLM_API_URL = 'http://localhost:3000/v1/chat/completions';
    process.env.LLM_MODEL = 'test-model';
    const result = createLlmSummarizerFromEnv();
    expect(result).toBeInstanceOf(LlmSummarizer);
  });
});
