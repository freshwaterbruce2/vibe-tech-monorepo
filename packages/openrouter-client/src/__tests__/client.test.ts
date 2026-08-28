import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { OpenRouterClient, createOpenRouterClient } from '../index.js';

vi.mock('axios');

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
  interceptors: {
    response: { use: vi.fn() },
  },
};

vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as ReturnType<typeof axios.create>);

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenRouterClient();
  });

  describe('chat()', () => {
    it('posts to /api/openrouter/chat with the request body', async () => {
      const mockResponse = {
        id: 'resp-1',
        model: 'openai/gpt-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.chat({
        model: 'openai/gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/openrouter/chat', {
        model: 'openai/gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result).toEqual(mockResponse);
    });

    it('passes optional parameters through', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });
      await client.chat({
        model: 'openai/gpt-4',
        messages: [],
        temperature: 0.7,
        max_tokens: 512,
      });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/openrouter/chat', {
        model: 'openai/gpt-4',
        messages: [],
        temperature: 0.7,
        max_tokens: 512,
      });
    });

    it('forwards tools/tool_choice and defaults model from the fallback stack', async () => {
      const mockResponse = {
        id: 'r-1',
        model: 'cohere/north-mini-code:free',
        choices: [
          {
            index: 0,
            finish_reason: 'tool_calls',
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 't1',
                  type: 'function',
                  function: { name: 'submit_critique', arguments: '{"score":0.9}' },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.chat({
        models: ['cohere/north-mini-code:free', 'deepseek/deepseek-v4-flash'],
        messages: [{ role: 'user', content: 'review' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_critique',
              parameters: { type: 'object', properties: {} },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'submit_critique' } },
      });

      const [, sentBody] = mockAxiosInstance.post.mock.calls[0] as [string, Record<string, unknown>];
      // model is defaulted from models[0] for the proxy; the fallback stack stays.
      expect(sentBody.model).toBe('cohere/north-mini-code:free');
      expect(sentBody.models).toEqual([
        'cohere/north-mini-code:free',
        'deepseek/deepseek-v4-flash',
      ]);
      expect(sentBody.tools).toHaveLength(1);
      expect(sentBody.tool_choice).toEqual({
        type: 'function',
        function: { name: 'submit_critique' },
      });
      expect(result.choices[0]?.message.tool_calls?.[0]?.function.name).toBe('submit_critique');
    });
  });

  describe('chatStream()', () => {
    function sseResponse(payload: string) {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        },
      });
      return { ok: true, status: 200, body } as unknown as Response;
    }

    it('yields parsed SSE chunks and stops at [DONE]', async () => {
      const payload =
        'data: {"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Hel"}}]}\n\n' +
        'data: {"choices":[{"index":0,"delta":{"content":"lo"}}],"usage":{"prompt_tokens":5,"completion_tokens":2}}\n\n' +
        'data: [DONE]\n\n';
      const fetchMock = vi.fn().mockResolvedValue(sseResponse(payload));
      vi.stubGlobal('fetch', fetchMock);

      const chunks = [];
      for await (const chunk of client.chatStream({
        models: ['deepseek/deepseek-v4-flash'],
        messages: [{ role: 'user', content: 'hi' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.choices[0]?.delta?.content).toBe('Hel');
      expect(chunks[1]?.usage?.completion_tokens).toBe(2);

      const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
      const sentBody = JSON.parse(init.body) as { model?: string; stream?: boolean };
      expect(sentBody.model).toBe('deepseek/deepseek-v4-flash');
      expect(sentBody.stream).toBe(true);

      vi.unstubAllGlobals();
    });

    it('skips malformed data lines and still yields valid chunks', async () => {
      const payload =
        'data: {bad json\n\n' +
        'data: {"choices":[{"index":0,"delta":{"content":"ok"}}]}\n\n' +
        'data: [DONE]\n\n';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(payload)));

      const chunks = [];
      for await (const chunk of client.chatStream({ models: ['x'], messages: [] })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.choices[0]?.delta?.content).toBe('ok');
      vi.unstubAllGlobals();
    });

    it('ends cleanly when the stream closes without an explicit [DONE]', async () => {
      const payload = 'data: {"choices":[{"index":0,"delta":{"content":"hi"}}]}\n\n';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(payload)));

      const chunks = [];
      for await (const chunk of client.chatStream({ models: ['x'], messages: [] })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.choices[0]?.delta?.content).toBe('hi');
      vi.unstubAllGlobals();
    });

    it('throws OpenRouterError when the stream response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          body: null,
          text: async () => 'unavailable',
        } as unknown as Response)
      );

      const iterator = client.chatStream({ models: ['x'], messages: [] });
      await expect(iterator.next()).rejects.toThrow(/chatStream request failed \(503\)/);

      vi.unstubAllGlobals();
    });
  });

  describe('re-exported helpers', () => {
    it('exposes pricing, model-alias and error helpers from the package root', async () => {
      const mod = await import('../index.js');
      expect(typeof mod.calcCost).toBe('function');
      expect(mod.DEFAULT_FALLBACK_STACK.length).toBeGreaterThan(0);
      expect(mod.resolveModelId('claude')).toContain('/');
      expect(
        mod.calcCost('deepseek/deepseek-v4-flash', {
          prompt_tokens: 1_000_000,
          completion_tokens: 0,
        })
      ).toBeCloseTo(0.09);
      expect(mod.OpenRouterError).toBeDefined();
    });
  });

  describe('getModels()', () => {
    it('returns the models array from response.data.data', async () => {
      const models = [{ id: 'openai/gpt-4', name: 'GPT-4' }];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { data: models } });

      const result = await client.getModels();
      expect(result).toEqual(models);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/openrouter/models');
    });
  });

  describe('getUsage()', () => {
    it('fetches usage with default period 24h', async () => {
      const usage = { total_requests: 10, total_tokens: 500, total_cost: 0.01, by_model: {} };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: usage });

      const result = await client.getUsage();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/openrouter/usage?period=24h');
      expect(result).toEqual(usage);
    });

    it('accepts a custom period string', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });
      await client.getUsage('7d');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/openrouter/usage?period=7d');
    });
  });

  describe('healthCheck()', () => {
    it('returns true when server responds with status ok', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { status: 'ok' } });
      expect(await client.healthCheck()).toBe(true);
    });

    it('returns false when server responds with non-ok status', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { status: 'degraded' } });
      expect(await client.healthCheck()).toBe(false);
    });

    it('returns false on network error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      expect(await client.healthCheck()).toBe(false);
    });
  });

  describe('retry interceptor', () => {
    it('retries failed requests when retries are configured', async () => {
      new OpenRouterClient('http://localhost:3001', { retries: 1, retryDelay: 0 });
      const [, onRejected] = mockAxiosInstance.interceptors.response.use.mock.calls[0] ?? [];
      if (typeof onRejected !== 'function') {
        throw new Error('Expected retry rejection interceptor to be registered');
      }

      const retryResult = { data: { ok: true } };
      const config = { url: '/retry-me', method: 'get' };
      mockAxiosInstance.request.mockResolvedValueOnce(retryResult);

      await expect(onRejected({ config })).resolves.toBe(retryResult);
      expect(config).toEqual({ url: '/retry-me', method: 'get', _retryCount: 1 });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(config);
    });

    it('rejects retry errors without request config', async () => {
      new OpenRouterClient('http://localhost:3001', { retries: 1, retryDelay: 0 });
      const [, onRejected] = mockAxiosInstance.interceptors.response.use.mock.calls[0] ?? [];
      if (typeof onRejected !== 'function') {
        throw new Error('Expected retry rejection interceptor to be registered');
      }

      const error = new Error('missing config');
      await expect(onRejected(error)).rejects.toBe(error);
      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });
  });
});

describe('createOpenRouterClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an OpenRouterClient instance', () => {
    expect(createOpenRouterClient()).toBeInstanceOf(OpenRouterClient);
  });

  it('passes baseURL to the constructor', () => {
    createOpenRouterClient('http://my-proxy:4000');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'http://my-proxy:4000' })
    );
  });
});
