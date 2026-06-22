import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for the backend AI proxy route handler (scripts/routes/ai-proxy.js).
 *
 * Locks the server-side fixes:
 *   - Key resolution accepts aliases (KIMI_API_KEY satisfies the moonshot
 *     upstream — the original bug only read MOONSHOT_API_KEY).
 *   - Auth gate: every /api/ai call requires a valid session.
 *   - Key custody: the injected provider key is added server-side as a Bearer
 *     header; the client sends none.
 */

import { spawn } from 'node:child_process';
import { Writable } from 'node:stream';

import { registerAiProxyRoutes } from '../../../scripts/routes/ai-proxy.js';

// Mock the telemetry spawn so tests never launch a real Python process.
// Provide a `default` export too (some consumers import the default) without
// spreading the real module — spreading re-leaks the real spawn under vitest.
vi.mock('node:child_process', () => {
  const spawn = vi.fn(() => ({ on: vi.fn(), unref: vi.fn() }));
  return { spawn, default: { spawn } };
});

/** Last positional arg passed to spawn() is always the JSON telemetry payload. */
function lastSpawnPayload() {
  const spawnMock = vi.mocked(spawn);
  const args = spawnMock.mock.calls[0][1] as string[];
  return JSON.parse(args[args.length - 1]);
}

const AI_KEYS = [
  'MOONSHOT_API_KEY',
  'KIMI_API_KEY',
  'VITE_MOONSHOT_API_KEY',
  'VITE_KIMI_API_KEY',
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'VITE_GOOGLE_API_KEY',
  'OPENROUTER_API_KEY',
  'VITE_OPENROUTER_API_KEY',
];

function clearKeys() {
  for (const k of AI_KEYS) delete process.env[k];
}

function makeRes() {
  const res: {
    status?: number;
    headers?: unknown;
    body?: string;
    headersSent: boolean;
    writableEnded: boolean;
    writeHead: (s: number, h?: unknown) => void;
    end: (b?: string) => void;
    write: () => void;
    on: () => unknown;
    removeListener: () => unknown;
    destroy: () => void;
  } = {
    headersSent: false,
    writableEnded: false,
    writeHead(status: number, headers?: unknown) {
      res.status = status;
      res.headers = headers;
      res.headersSent = true;
    },
    end(body?: string) {
      res.body = body;
      res.writableEnded = true;
    },
    write() {
      /* streaming chunk */
    },
    on() {
      return res;
    },
    removeListener() {
      return res;
    },
    destroy() {
      res.writableEnded = true;
    },
  };
  return res;
}

/**
 * A real Writable that also implements writeHead/headersSent, so the route's
 * SSE branch (Readable.fromWeb -> pipeline -> res) can actually pipe to it.
 */
class MockServerResponse extends Writable {
  status?: number;
  headers?: Record<string, string>;
  headersSent = false;
  private chunks: Buffer[] = [];
  writeHead(status: number, headers?: Record<string, string>): this {
    this.status = status;
    this.headers = headers;
    this.headersSent = true;
    return this;
  }
  override _write(chunk: Buffer, _enc: BufferEncoding, cb: (e?: Error | null) => void): void {
    this.chunks.push(Buffer.from(chunk));
    cb();
  }
  get bodyText(): string {
    return Buffer.concat(this.chunks).toString();
  }
}

// db mock: 'user-1' exists; any other id is treated as a deleted/unknown user.
const ctxBase = {
  parseCookies: (cookie?: string) => (cookie ? { sid: cookie.replace('sid=', '') } : {}),
  getSessionCookieName: () => 'sid',
  parseSessionToken: (token: string) =>
    token === 'good' ? { sub: 'user-1' } : token === 'stale' ? { sub: 'ghost' } : null,
  getBody: async () => JSON.stringify({ model: 'kimi-k2.5', messages: [] }),
  db: {
    prepare: (_sql: string) => ({
      get: (id: string) => (id === 'user-1' ? { id: 'user-1' } : undefined),
    }),
  },
};

function req(method: string, path: string, cookie?: string) {
  return { method, url: path, headers: { host: 'localhost', ...(cookie ? { cookie } : {}) } };
}

describe('ai-proxy route handler', () => {
  beforeEach(() => {
    clearKeys();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    clearKeys();
  });

  describe('health key resolution', () => {
    it('reports moonshot configured when only KIMI_API_KEY is set (alias bug fix)', async () => {
      process.env['KIMI_API_KEY'] = 'k-123';
      const res = makeRes();
      await registerAiProxyRoutes(req('GET', '/api/ai/health'), res, ctxBase);
      const payload = JSON.parse(res.body as string);
      expect(res.status).toBe(200);
      expect(payload.configured.moonshot).toBe(true);
      expect(payload.configured.openrouter).toBe(false);
    });

    it('reports openrouter configured from VITE_OPENROUTER_API_KEY alias', async () => {
      process.env['VITE_OPENROUTER_API_KEY'] = 'or-123';
      const res = makeRes();
      await registerAiProxyRoutes(req('GET', '/api/ai/health'), res, ctxBase);
      expect(JSON.parse(res.body as string).configured.openrouter).toBe(true);
    });
  });

  describe('auth gate', () => {
    it('returns 401 for an AI call without a session', async () => {
      process.env['KIMI_API_KEY'] = 'k-123';
      const res = makeRes();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions'),
        res,
        ctxBase
      );
      expect(res.status).toBe(401);
    });

    it('returns 401 when the session user no longer exists (revocation check)', async () => {
      process.env['KIMI_API_KEY'] = 'k-123';
      const res = makeRes();
      // 'stale' parses to a valid token for user 'ghost', who is not in the DB.
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=stale'),
        res,
        ctxBase
      );
      expect(res.status).toBe(401);
    });
  });

  describe('provider configuration gate', () => {
    it('returns 503 when no key is configured for the provider', async () => {
      const res = makeRes();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res,
        ctxBase
      );
      expect(res.status).toBe(503);
      expect(JSON.parse(res.body as string).hint).toMatch(/KIMI_API_KEY/);
    });

    it('returns 404 for an unknown provider segment', async () => {
      const res = makeRes();
      await registerAiProxyRoutes(req('POST', '/api/ai/bogus/x', 'sid=good'), res, ctxBase);
      expect(res.status).toBe(404);
    });
  });

  describe('key custody (server injects Bearer)', () => {
    it('forwards upstream with the resolved key as a Bearer header', async () => {
      process.env['KIMI_API_KEY'] = 'k-secret';
      const fetchMock = vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => '{"choices":[]}',
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const res = makeRes();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res,
        ctxBase
      );

      expect(res.status).toBe(200);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.moonshot.ai/v1/chat/completions');
      expect(init.headers.Authorization).toBe('Bearer k-secret');
    });
  });

  describe('streaming passthrough & upstream failures', () => {
    it('pipes a text/event-stream upstream response through to the client', async () => {
      process.env['KIMI_API_KEY'] = 'k-secret';
      const encoder = new TextEncoder();
      const upstreamBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          get: (h: string) => (h.toLowerCase() === 'content-type' ? 'text/event-stream' : null),
        },
        body: upstreamBody,
      }) as unknown as typeof fetch;

      const res = new MockServerResponse();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res as unknown as ReturnType<typeof makeRes>,
        ctxBase
      );

      expect(res.status).toBe(200);
      expect(res.headers?.['Content-Type']).toBe('text/event-stream');
      expect(res.bodyText).toContain('data: [DONE]');
    });

    it('returns 502 when the upstream fetch throws', async () => {
      process.env['KIMI_API_KEY'] = 'k-secret';
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch;
      const res = makeRes();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res,
        ctxBase
      );
      expect(res.status).toBe(502);
      expect(JSON.parse(res.body as string).error).toMatch(/Upstream AI request failed/);
    });
  });

  describe('telemetry recording', () => {
    beforeEach(() => {
      vi.mocked(spawn).mockClear();
    });

    it('records model + tokens from a non-streaming response', async () => {
      process.env['KIMI_API_KEY'] = 'k-secret';
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () =>
          JSON.stringify({ model: 'kimi-resolved', choices: [], usage: { total_tokens: 1234 } }),
      }) as unknown as typeof fetch;

      const res = makeRes();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res,
        ctxBase
      );

      expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
      const payload = lastSpawnPayload();
      expect(payload.provider).toBe('moonshot');
      expect(payload.model).toBe('kimi-resolved');
      expect(payload.tokensUsed).toBe(1234);
    });

    it('taps usage + model from the SSE stream', async () => {
      process.env['KIMI_API_KEY'] = 'k-secret';
      const encoder = new TextEncoder();
      const upstreamBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"model":"kimi-stream","choices":[{"delta":{"content":"hi"}}]}\n\n'
            )
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[],"usage":{"total_tokens":55}}\n\n')
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          get: (h: string) => (h.toLowerCase() === 'content-type' ? 'text/event-stream' : null),
        },
        body: upstreamBody,
      }) as unknown as typeof fetch;

      const res = new MockServerResponse();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res as unknown as ReturnType<typeof makeRes>,
        ctxBase
      );

      expect(res.bodyText).toContain('data: [DONE]');
      expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
      const payload = lastSpawnPayload();
      expect(payload.model).toBe('kimi-stream');
      expect(payload.tokensUsed).toBe(55);
    });

    it('degrades to null tokens when the stream has no usage chunk', async () => {
      process.env['KIMI_API_KEY'] = 'k-secret';
      const encoder = new TextEncoder();
      const upstreamBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"model":"kimi-stream","choices":[{"delta":{"content":"hi"}}]}\n\n'
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: {
          get: (h: string) => (h.toLowerCase() === 'content-type' ? 'text/event-stream' : null),
        },
        body: upstreamBody,
      }) as unknown as typeof fetch;

      const res = new MockServerResponse();
      await registerAiProxyRoutes(
        req('POST', '/api/ai/moonshot/v1/chat/completions', 'sid=good'),
        res as unknown as ReturnType<typeof makeRes>,
        ctxBase
      );

      expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
      const payload = lastSpawnPayload();
      expect(payload.model).toBe('kimi-stream');
      expect(payload.tokensUsed).toBeNull();
    });
  });
});
