import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for BackendProxyService — the client side of the server-proxied AI path.
 *
 * Regression coverage for the "agent mode does nothing" bug. Two root causes
 * were fixed here:
 *   1. Moonshot/Kimi rejects arbitrary temperatures (HTTP 400
 *      "invalid temperature: only 1 is allowed") — the proxy client now mirrors
 *      MoonshotService and sends a fixed temperature + explicit thinking mode.
 *   2. Provider routing must recognize Kimi aliases (not just the one registered
 *      model id) so the request reaches the moonshot upstream.
 *
 * Key custody invariant: the client NEVER sends an Authorization header and
 * always uses credentials:'include' so the backend injects the provider key.
 */

import { BackendProxyService } from '../../services/ai/providers/BackendProxyService';
import type { ChatMessage } from '../../types/ai';

const BASE = 'http://test-proxy/api/ai';
const msgs: ChatMessage[] = [{ role: 'user', content: 'ping' }];

const CHAT_PAYLOAD = {
  choices: [{ message: { content: 'PONG', reasoning: 'thought' } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

function okJson(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

function errResponse(status: number, text: string): Response {
  return { ok: false, status, json: async () => ({}), text: async () => text } as unknown as Response;
}

/** Build an ok streaming Response whose body emits the given pieces as SSE bytes. */
function sseResponse(pieces: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
  return { ok: true, status: 200, body, text: async () => '' } as unknown as Response;
}

function lastCall(): [string, RequestInit] {
  const calls = vi.mocked(global.fetch).mock.calls;
  return calls[calls.length - 1] as unknown as [string, RequestInit];
}
function lastBody(): Record<string, unknown> {
  return JSON.parse(lastCall()[1].body as string);
}

describe('BackendProxyService', () => {
  let svc: BackendProxyService;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(okJson(CHAT_PAYLOAD));
    svc = new BackendProxyService({ baseUrl: BASE });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('moonshot routing & request shaping', () => {
    it('forces temperature 0.6 + thinking disabled for kimi-k2.5 (non-thinking)', async () => {
      await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro', temperature: 0.3 });
      expect(lastCall()[0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
      const body = lastBody();
      expect(body.model).toBe('kimi-k2.5');
      expect(body.temperature).toBe(0.6);
      expect(body.thinking).toEqual({ type: 'disabled' });
    });

    it('forces temperature 1.0 + thinking enabled for a kimi thinking model', async () => {
      await svc.complete({ messages: msgs, model: 'kimi-thinking', temperature: 0.3 });
      expect(lastCall()[0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
      const body = lastBody();
      expect(body.model).toBe('kimi-k2-thinking');
      expect(body.temperature).toBe(1.0);
      expect(body.thinking).toEqual({ type: 'enabled' });
    });

    it('ignores the caller temperature entirely (regression: 400 invalid temperature)', async () => {
      await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro', temperature: 0.99 });
      expect(lastBody().temperature).toBe(0.6);
    });
  });

  describe('openrouter routing', () => {
    it('passes the model verbatim, forwards caller temperature, omits thinking', async () => {
      await svc.complete({ messages: msgs, model: 'deepseek/deepseek-r1', temperature: 0.3 });
      expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
      const body = lastBody();
      expect(body.model).toBe('deepseek/deepseek-r1');
      expect(body.temperature).toBe(0.3);
      expect(body.thinking).toBeUndefined();
    });

    it('routes unknown models through openrouter (safe default)', async () => {
      await svc.complete({ messages: msgs, model: 'some/unknown-model' });
      expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    });

    it('maps a bare OpenRouter alias to its canonical author/slug id', async () => {
      // Regression: the analysis services pass bare 'gpt-4o'; OpenRouter 400s on
      // slug-only ids, so the proxy client must mirror OpenRouterService.resolveModelId.
      await svc.complete({ messages: msgs, model: 'gpt-4o' });
      expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
      expect(lastBody().model).toBe('openai/gpt-4o');
    });
  });

  describe('google routing', () => {
    it('strips the google/ prefix for unregistered gemini ids', async () => {
      await svc.complete({ messages: msgs, model: 'google/gemini-flash-latest' });
      expect(lastCall()[0]).toBe(`${BASE}/google/v1beta/openai/chat/completions`);
      expect(lastBody().model).toBe('gemini-flash-latest');
    });
  });

  describe('key custody invariants', () => {
    it('never sends Authorization and always includes credentials', async () => {
      await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
      const init = lastCall()[1];
      expect(init.credentials).toBe('include');
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('defaults & response parsing', () => {
    it('falls back to the default model and max_tokens when omitted', async () => {
      await svc.complete({ messages: msgs });
      const body = lastBody();
      expect(body.model).toBe('kimi-k2.5');
      expect(body.max_tokens).toBe(8192);
    });

    it('maps the upstream choice to content/usage/provider', async () => {
      const res = await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
      expect(res.content).toBe('PONG');
      expect(res.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
      expect(res.provider).toBe('backend-proxy');
    });
  });

  describe('error surfacing', () => {
    it('throws with status + upstream body on a non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue(errResponse(503, 'not configured'));
      await expect(
        svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' })
      ).rejects.toThrow(/503.*not configured/);
    });
  });

  describe('validateConnection', () => {
    it('GETs /health with credentials and returns ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
      const ok = await svc.validateConnection();
      expect(ok).toBe(true);
      expect(lastCall()[0]).toBe(`${BASE}/health`);
      expect(lastCall()[1].credentials).toBe('include');
    });

    it('returns false when the health check throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      expect(await svc.validateConnection()).toBe(false);
    });

    it('returns true when /health reports at least one configured provider', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, configured: { moonshot: true, openrouter: false } }),
      } as unknown as Response);
      expect(await svc.validateConnection()).toBe(true);
    });

    it('returns false when /health reports zero configured providers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, configured: { moonshot: false, openrouter: false } }),
      } as unknown as Response);
      expect(await svc.validateConnection()).toBe(false);
    });

    it('treats a non-JSON 200 as reachable (failure-safe)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('no body');
        },
      } as unknown as Response);
      expect(await svc.validateConnection()).toBe(true);
    });
  });

  describe('getAvailableModels', () => {
    it('returns the model registry', async () => {
      const models = await svc.getAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id === 'moonshot/kimi-2.5-pro')).toBe(true);
    });
  });

  describe('resolveProvider registry precedence', () => {
    it('routes a registered google/* id through its registered OpenRouter upstream', async () => {
      // google/gemini-3.1-pro is registered with provider OPENROUTER in
      // MODEL_REGISTRY. The registry must win over the 'google/' name-prefix
      // heuristic, otherwise an OpenRouter-hosted Gemini would 404 on /google.
      await svc.complete({ messages: msgs, model: 'google/gemini-3.1-pro' });
      expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    });
  });

  describe('streaming (stream / drainSSE / parseChunk)', () => {
    it('yields content deltas from SSE and stops at [DONE]', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n',
          'data: {"choices":[{"delta":{"content":"lo"}}]}\n',
          'data: [DONE]\n',
        ])
      );
      const out: string[] = [];
      for await (const chunk of svc.stream(msgs, { model: 'moonshot/kimi-2.5-pro' })) {
        out.push(chunk);
      }
      expect(out.join('')).toBe('Hello');
      expect(lastBody().stream).toBe(true);
    });

    it('tolerates malformed and empty-delta chunks (parseChunk returns null)', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        sseResponse([
          'data: not-json\n',
          'data: {"choices":[{"delta":{}}]}\n',
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n',
        ])
      );
      const out: string[] = [];
      for await (const chunk of svc.stream(msgs)) out.push(chunk);
      expect(out).toEqual(['ok']);
    });

    it('reassembles a delta split across read() boundaries', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"con',
          'tent":"Split"}}]}\n',
          'data: [DONE]\n',
        ])
      );
      const out: string[] = [];
      for await (const chunk of svc.stream(msgs)) out.push(chunk);
      expect(out.join('')).toBe('Split');
    });

    it('throws with status + body when the stream response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue(errResponse(502, 'upstream down'));
      const gen = svc.stream(msgs);
      await expect(gen.next()).rejects.toThrow(/502.*upstream down/);
    });
  });

  describe('cancellation', () => {
    it('forwards the caller AbortSignal so aborting tears down the fetch', async () => {
      const ctrl = new AbortController();
      let seen: AbortSignal | undefined;
      global.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        seen = init.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      });
      const p = svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro', signal: ctrl.signal });
      ctrl.abort();
      await expect(p).rejects.toThrow(/aborted/);
      expect(seen?.aborted).toBe(true);
    });

    it('cancelStream aborts in-flight stream controllers', async () => {
      let inner: AbortSignal | undefined;
      global.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        inner = init.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('stream aborted')));
        });
      });
      const gen = svc.stream(msgs, { model: 'moonshot/kimi-2.5-pro' });
      const next = gen.next();
      await Promise.resolve(); // let the generator reach the awaited fetch
      svc.cancelStream();
      await expect(next).rejects.toThrow(/stream aborted/);
      expect(inner?.aborted).toBe(true);
    });
  });

  describe('convenience methods', () => {
    it('chat returns the completion content', async () => {
      expect(await svc.chat(msgs, { model: 'moonshot/kimi-2.5-pro' })).toBe('PONG');
    });

    it('generateText wraps the prompt as a single user message', async () => {
      await svc.generateText('hello there', { model: 'moonshot/kimi-2.5-pro' });
      expect(lastBody().messages).toEqual([{ role: 'user', content: 'hello there' }]);
    });

    it('getUsageStats returns zeroed stats', async () => {
      expect(await svc.getUsageStats()).toEqual({
        tokensUsed: 0,
        estimatedCost: 0,
        requestCount: 0,
      });
    });
  });
});
