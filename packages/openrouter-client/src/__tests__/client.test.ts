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
