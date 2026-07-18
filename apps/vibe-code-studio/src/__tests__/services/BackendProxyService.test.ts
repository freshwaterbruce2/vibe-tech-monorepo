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
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => text,
  } as unknown as Response;
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
    it('forwards strict structured-output and provider capability requirements', async () => {
      const schema = { type: 'object', properties: { title: { type: 'string' } } };
      await svc.complete({
        messages: msgs,
        model: 'anthropic/claude-sonnet-4.6',
        responseFormat: {
          type: 'json_schema',
          jsonSchema: { name: 'agent_plan_v1', strict: true, schema },
        },
        providerPreferences: { requireParameters: true },
      });

      expect(lastBody()).toMatchObject({
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'agent_plan_v1', strict: true, schema },
        },
        provider: { require_parameters: true },
      });
    });

    it('forwards native tool definitions and required tool choice', async () => {
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'submit_agent_plan',
            description: 'submit',
            parameters: { type: 'object' },
          },
        },
      ];
      await svc.complete({
        messages: msgs,
        model: 'anthropic/claude-sonnet-4.6',
        tools,
        toolChoice: 'required',
      });
      expect(lastBody()).toMatchObject({ tools, tool_choice: 'required' });
    });

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
      // Default is the unified app default (deepseek/deepseek-v4-pro), a registered
      // OpenRouter model — so it routes through OpenRouter, not Moonshot.
      expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
      const body = lastBody();
      expect(body.model).toBe('deepseek/deepseek-v4-pro');
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
      expect(models.some(m => m.id === 'moonshot/kimi-2.5-pro')).toBe(true);
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
      global.fetch = vi
        .fn()
        .mockResolvedValue(
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
      global.fetch = vi
        .fn()
        .mockResolvedValue(
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
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          sseResponse(['data: {"choices":[{"delta":{"con', 'tent":"Split"}}]}\n', 'data: [DONE]\n'])
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
      const p = svc.complete({
        messages: msgs,
        model: 'moonshot/kimi-2.5-pro',
        signal: ctrl.signal,
      });
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

/**
 * Key-aware rerouting (v1.2.1): when the natural provider has no SERVER-side
 * key but OpenRouter does, buildRoute translates the model to its
 * OpenRouter-hosted id and sends it via the OpenRouter route. 17+ call sites
 * hardcode moonshot/google ids; without this they 503 in installed builds.
 *
 * configuredSnapshot() is disabled under vitest (returns null), so these tests
 * stub the VITEST env off and seed the private configuredCache directly.
 */
describe('BackendProxyService — key-aware rerouting', () => {
  let svc: BackendProxyService;

  function seedConfigured(value: Record<string, boolean>) {
    (
      svc as unknown as { configuredCache: { value: Record<string, boolean>; at: number } | null }
    ).configuredCache = { value, at: Date.now() };
  }

  beforeEach(() => {
    vi.stubEnv('VITEST', '');
    global.fetch = vi.fn().mockResolvedValue(okJson(CHAT_PAYLOAD));
    svc = new BackendProxyService({ baseUrl: BASE });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reroutes a hardcoded kimi id through OpenRouter when moonshot has no server key', async () => {
    seedConfigured({ moonshot: false, openrouter: true });
    await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro', temperature: 0.3 });

    expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    const body = lastBody();
    // upstream id gains the OpenRouter author prefix
    expect(body.model).toBe('moonshotai/kimi-k2.5');
    // OpenRouter route: caller temperature passes through, no thinking fields
    expect(body.temperature).toBe(0.3);
    expect(body.thinking).toBeUndefined();
  });

  it('reroutes an unregistered gemini id through OpenRouter when google has no server key', async () => {
    seedConfigured({ google: false, openrouter: true });
    await svc.complete({ messages: msgs, model: 'gemini-2.0-flash', temperature: 0.5 });

    expect(lastCall()[0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    expect(lastBody().model).toBe('google/gemini-2.0-flash');
  });

  it('does NOT reroute when the natural provider has a server key', async () => {
    seedConfigured({ moonshot: true, openrouter: true });
    await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });

    expect(lastCall()[0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
    const body = lastBody();
    expect(body.model).toBe('kimi-k2.5');
    // moonshot shaping still applies on the moonshot route
    expect(body.thinking).toEqual({ type: 'disabled' });
  });

  it('does NOT reroute when OpenRouter itself has no server key', async () => {
    seedConfigured({ moonshot: false, openrouter: false });
    await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });

    expect(lastCall()[0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
    expect(lastBody().model).toBe('kimi-k2.5');
  });

  it('keeps legacy behavior (no reroute) when no snapshot exists yet', async () => {
    // no seed — configuredCache is null and the background refresh is async
    await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
    expect(lastCall()[0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
  });
});

/**
 * Quota fallback (429/402 → single OpenRouter retry). Unlike the key-aware
 * rerouting above, quotaFallbackRoute reads this.configuredCache DIRECTLY (a
 * fallback decision happens after a real upstream response), so these tests
 * keep the VITEST guard active — buildRoute stays on the natural provider —
 * and seed the private cache to enable the fallback.
 */
describe('BackendProxyService — quota fallback (429/402 retry via OpenRouter)', () => {
  let svc: BackendProxyService;

  function seedConfigured(value: Record<string, boolean>) {
    (
      svc as unknown as {
        configuredCache: { value: Record<string, boolean>; at: number } | null;
      }
    ).configuredCache = { value, at: Date.now() };
  }

  function fetchCalls(): Array<[string, RequestInit]> {
    return vi.mocked(global.fetch).mock.calls as unknown as Array<[string, RequestInit]>;
  }

  function bodyOfCall(index: number): Record<string, unknown> {
    return JSON.parse(fetchCalls()[index]![1].body as string);
  }

  beforeEach(() => {
    global.fetch = vi.fn();
    svc = new BackendProxyService({ baseUrl: BASE });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('complete(): retries a moonshot 429 once via OpenRouter with OpenRouter shaping', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(429, 'insufficient balance'))
      .mockResolvedValueOnce(okJson(CHAT_PAYLOAD));

    const res = await svc.complete({
      messages: msgs,
      model: 'moonshot/kimi-2.5-pro',
      temperature: 0.3,
    });

    expect(res.content).toBe('PONG');
    expect(fetchCalls()).toHaveLength(2);
    expect(fetchCalls()[0]![0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
    expect(fetchCalls()[1]![0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    // first attempt was moonshot-shaped…
    expect(bodyOfCall(0).model).toBe('kimi-k2.5');
    expect(bodyOfCall(0).thinking).toEqual({ type: 'disabled' });
    // …the retry is OpenRouter-shaped: author-prefixed id, no thinking, caller temp
    const retryBody = bodyOfCall(1);
    expect(retryBody.model).toBe('moonshotai/kimi-k2.5');
    expect(retryBody.thinking).toBeUndefined();
    expect(retryBody.temperature).toBe(0.3);
  });

  it('complete(): throws a combined error when the OpenRouter fallback also fails', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(429, 'quota exceeded'))
      .mockResolvedValueOnce(errResponse(402, 'no balance'));

    await expect(svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' })).rejects.toThrow(
      /AI proxy error \(429\): quota exceeded.*OpenRouter fallback failed with 402: no balance/
    );
    expect(fetchCalls()).toHaveLength(2);
  });

  it('complete(): 402 on the natural route also triggers the fallback', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(402, 'payment required'))
      .mockResolvedValueOnce(okJson(CHAT_PAYLOAD));

    const res = await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
    expect(res.content).toBe('PONG');
    expect(fetchCalls()).toHaveLength(2);
    expect(fetchCalls()[1]![0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
  });

  it('does NOT fall back when the server has no OpenRouter key', async () => {
    seedConfigured({ openrouter: false });
    vi.mocked(global.fetch).mockResolvedValue(errResponse(429, 'insufficient balance'));

    await expect(svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' })).rejects.toThrow(
      /AI proxy error \(429\): insufficient balance/
    );
    expect(fetchCalls()).toHaveLength(1);
  });

  it('does NOT fall back when no configured snapshot exists at all', async () => {
    // configuredCache stays null — legacy single-attempt behavior
    vi.mocked(global.fetch).mockResolvedValue(errResponse(429, 'insufficient balance'));

    await expect(svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' })).rejects.toThrow(
      /AI proxy error \(429\)/
    );
    expect(fetchCalls()).toHaveLength(1);
  });

  it('does NOT fall back on non-quota statuses (500)', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch).mockResolvedValue(errResponse(500, 'internal error'));

    await expect(svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' })).rejects.toThrow(
      /AI proxy error \(500\): internal error/
    );
    expect(fetchCalls()).toHaveLength(1);
  });

  it('does NOT fall back when the route is already OpenRouter', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch).mockResolvedValue(errResponse(429, 'quota'));

    await expect(svc.complete({ messages: msgs, model: 'deepseek/deepseek-r1' })).rejects.toThrow(
      /AI proxy error \(429\): quota/
    );
    expect(fetchCalls()).toHaveLength(1);
    expect(fetchCalls()[0]![0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
  });

  it('does not double-prefix an already moonshotai/-prefixed model on fallback', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(429, 'quota'))
      .mockResolvedValueOnce(okJson(CHAT_PAYLOAD));

    await svc.complete({ messages: msgs, model: 'moonshotai/kimi-k2.5' });
    expect(fetchCalls()[0]![0]).toBe(`${BASE}/moonshot/v1/chat/completions`);
    expect(bodyOfCall(1).model).toBe('moonshotai/kimi-k2.5');
  });

  it('keeps an existing google/ prefix when falling back from the google route', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(429, 'quota'))
      .mockResolvedValueOnce(okJson(CHAT_PAYLOAD));

    await svc.complete({ messages: msgs, model: 'google/gemini-flash-latest' });
    expect(fetchCalls()[0]![0]).toBe(`${BASE}/google/v1beta/openai/chat/completions`);
    expect(fetchCalls()[1]![0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    expect(bodyOfCall(1).model).toBe('google/gemini-flash-latest');
  });

  it('buildOpenRouterRoute maps other providers through the OpenRouter alias table', () => {
    // Defensive branch — unreachable via quota fallback (an OpenRouter route
    // never falls back to itself), so exercise the private method directly.
    const route = (
      svc as unknown as {
        buildOpenRouterRoute: (m: string) => { url: string; model: string };
      }
    ).buildOpenRouterRoute('gpt-4o');
    expect(route.url).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    expect(route.model).toBe('openai/gpt-4o');
  });

  it('stream(): retries a moonshot 429 once via OpenRouter and yields the SSE deltas', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(429, 'insufficient balance'))
      .mockResolvedValueOnce(
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
    expect(fetchCalls()).toHaveLength(2);
    expect(fetchCalls()[1]![0]).toBe(`${BASE}/openrouter/api/v1/chat/completions`);
    const retryBody = bodyOfCall(1);
    expect(retryBody.model).toBe('moonshotai/kimi-k2.5');
    expect(retryBody.stream).toBe(true);
    expect(retryBody.thinking).toBeUndefined();
  });

  it('stream(): throws a combined error when the fallback stream also fails', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(429, 'quota'))
      .mockResolvedValueOnce(errResponse(502, 'bad gateway'));

    const gen = svc.stream(msgs, { model: 'moonshot/kimi-2.5-pro' });
    await expect(gen.next()).rejects.toThrow(
      /AI proxy stream error \(429\): quota.*OpenRouter fallback failed with 502: bad gateway/
    );
    expect(fetchCalls()).toHaveLength(2);
  });

  it('stream(): does not fall back on a non-quota stream error', async () => {
    seedConfigured({ openrouter: true });
    vi.mocked(global.fetch).mockResolvedValue(errResponse(503, 'not configured'));

    const gen = svc.stream(msgs, { model: 'moonshot/kimi-2.5-pro' });
    await expect(gen.next()).rejects.toThrow(/AI proxy stream error \(503\): not configured/);
    expect(fetchCalls()).toHaveLength(1);
  });
});

/**
 * refreshConfigured dedups concurrent /health probes via healthInFlight so a
 * burst of requests fires a single fetch. configuredSnapshot() short-circuits
 * under vitest, so drive refreshConfigured() directly (it has no VITEST guard).
 */
describe('BackendProxyService — refreshConfigured in-flight dedup', () => {
  let svc: BackendProxyService;

  beforeEach(() => {
    svc = new BackendProxyService({ baseUrl: BASE });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const refresh = (s: BackendProxyService): Promise<void> =>
    (s as unknown as { refreshConfigured: () => Promise<void> }).refreshConfigured();

  it('coalesces concurrent probes into a single /health fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: { openrouter: true } }),
    } as unknown as Response);
    global.fetch = fetchMock;

    await Promise.all([refresh(svc), refresh(svc), refresh(svc)]);

    const healthCalls = fetchMock.mock.calls.filter(([url]) => String(url) === `${BASE}/health`);
    expect(healthCalls).toHaveLength(1);
    // Snapshot landed, so isOpenRouterConfigured now reads it without another fetch.
    expect(
      await (
        svc as unknown as { isOpenRouterConfigured: () => Promise<boolean> }
      ).isOpenRouterConfigured()
    ).toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === `${BASE}/health`)).toHaveLength(
      1
    );
  });

  it('clears healthInFlight so a later probe fetches again', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: { openrouter: false } }),
    } as unknown as Response);
    global.fetch = fetchMock;

    await refresh(svc);
    await refresh(svc);

    expect(fetchMock.mock.calls.filter(([url]) => String(url) === `${BASE}/health`)).toHaveLength(
      2
    );
  });

  it('isOpenRouterConfigured awaits a cold-cache /health probe when NOT under vitest', async () => {
    // configuredCache is null and VITEST is stubbed off, so the quota-fallback
    // path must fetch /health once and read the fresh snapshot.
    vi.stubEnv('VITEST', '');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configured: { openrouter: true } }),
    } as unknown as Response);
    global.fetch = fetchMock;

    const configured = await (
      svc as unknown as { isOpenRouterConfigured: () => Promise<boolean> }
    ).isOpenRouterConfigured();

    expect(configured).toBe(true);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === `${BASE}/health`)).toHaveLength(
      1
    );
    vi.unstubAllEnvs();
  });
});

describe('BackendProxyService — parseCompletion reasoning fields', () => {
  let svc: BackendProxyService;

  beforeEach(() => {
    svc = new BackendProxyService({ baseUrl: BASE });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers reasoning_content (kimi-k2.5) when both fields are present', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        choices: [{ message: { content: 'A', reasoning_content: 'RC', reasoning: 'R' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })
    );
    const res = await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
    expect(res.reasoning_content).toBe('RC');
  });

  it('falls back to reasoning (K2.6) when reasoning_content is absent', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        choices: [{ message: { content: 'A', reasoning: 'R-only' } }],
      })
    );
    const res = await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
    expect(res.reasoning_content).toBe('R-only');
    // absent usage zero-fills
    expect(res.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });

  it('returns empty content and no reasoning when the choices array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ choices: [] }));
    const res = await svc.complete({ messages: msgs, model: 'moonshot/kimi-2.5-pro' });
    expect(res.content).toBe('');
    expect(res.reasoning_content).toBeUndefined();
  });
});
