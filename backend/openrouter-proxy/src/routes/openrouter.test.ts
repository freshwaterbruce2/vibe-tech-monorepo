import { EventEmitter } from 'events';
import { createServer, type Server } from 'http';
import axios from 'axios';
import express, { type Express } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateCost, openRouterRouter, refreshLivePricing } from './openrouter';
import { trackUsage } from '../utils/usage';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../utils/usage', () => ({
  getUsageStats: vi.fn(async () => ({
    by_model: {},
    total_cost: 0,
    total_requests: 0,
    total_tokens: 0,
  })),
  trackUsage: vi.fn(async () => undefined),
}));

const mockedAxios = vi.mocked(axios);
const mockedTrackUsage = vi.mocked(trackUsage);

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(openRouterRouter);
  return app;
}

async function waitForListener(stream: EventEmitter, eventName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (stream.listenerCount(eventName) > 0) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt > 1000) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${eventName} listener`));
      }
    }, 5);
  });
}

async function postJson(app: Express, path: string, body: unknown) {
  let server: Server | undefined;

  try {
    server = await new Promise<Server>((resolve) => {
      const listeningServer = createServer(app);
      listeningServer.listen(0, '127.0.0.1', () => resolve(listeningServer));
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    return {
      body: await response.text(),
      status: response.status,
    };
  } finally {
    const serverToClose = server;
    if (serverToClose) {
      await new Promise<void>((resolve, reject) => {
        serverToClose.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }
}

describe('openRouterRouter streaming chat', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it('ignores late stream errors after the DONE frame closes the response', async () => {
    const stream = new EventEmitter();
    mockedAxios.post.mockResolvedValueOnce({ data: stream });

    const responsePromise = postJson(createTestApp(), '/chat', {
      messages: [{ role: 'user', content: 'hello' }],
      model: 'test/model',
      stream: true,
    });

    await waitForListener(stream, 'data');

    stream.emit(
      'data',
      Buffer.from('data: {"usage":{"total_tokens":42}}\n\ndata: [DONE]\n\n'),
    );
    stream.emit('error', new Error('late stream error'));

    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(response.body).toContain('data: {"usage":{"total_tokens":42}}');
    expect(response.body).toContain('data: [DONE]');
    expect(response.body).not.toContain('late stream error');
    expect(mockedTrackUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test/model',
        tokens: 42,
      }),
    );
  });
});

describe('calculateCost pricing', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it('returns 0 when usage is missing', () => {
    expect(calculateCost('anthropic/claude-opus-4.5')).toBe(0);
  });

  it('prefers live pricing from the OpenRouter /models endpoint', async () => {
    // OpenRouter reports pricing as USD-per-token strings.
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'vendor/live-model',
            pricing: { prompt: '0.000002', completion: '0.000008' },
          },
        ],
      },
    });

    await refreshLivePricing();

    // 1M prompt tokens * $0.000002 + 1M completion tokens * $0.000008 = $10.
    const cost = calculateCost('vendor/live-model', {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    });

    expect(cost).toBeCloseTo(10, 6);
  });

  it('falls back to the static table for models missing from live pricing', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { data: [{ id: 'vendor/other', pricing: { prompt: '0', completion: '0' } }] },
    });

    await refreshLivePricing();

    // claude-opus-4.5 fallback: input 0.015, output 0.075 per 1M tokens.
    const cost = calculateCost('anthropic/claude-opus-4.5', {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    });

    expect(cost).toBeCloseTo(0.09, 6);
  });

  it('throws when the API key is not configured', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(refreshLivePricing()).rejects.toThrow('OPENROUTER_API_KEY not configured');
  });
});
