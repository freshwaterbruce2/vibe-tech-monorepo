/**
 * Contract tests: useGravityClaw (client) <-> gravity-claw POST /api/chat (server).
 * Focuses on schema agreement and error-handling contracts — NOT hook behavior
 * (see useGravityClaw.test.ts for that).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGravityClaw, type GCMessage } from '../useGravityClaw';

const encoder = new TextEncoder();
const mockFetch = () => fetch as ReturnType<typeof vi.fn>;

function mockStream(chunks: string[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i < chunks.length) c.enqueue(encoder.encode(chunks[i++]));
      else c.close();
    },
  });
}

function ok(chunks: string[]): Response {
  return { ok: true, status: 200, body: mockStream(chunks) } as unknown as Response;
}

function errResp(status: number, body: { error: string }): Response {
  return { ok: false, status, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

describe('gravityClaw contract', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.restoreAllMocks());

  // 1. Request body shape matches server expectation
  it('sends exactly { messages, model } with no extra fields', async () => {
    mockFetch().mockResolvedValue(ok(['ok']));
    const { result } = renderHook(() => useGravityClaw());
    await act(async () => {
      await result.current.sendMessage([{ role: 'user', content: 'hi' }], { model: 'm' });
    });
    const body = JSON.parse(mockFetch().mock.calls[0]![1]!.body as string);
    expect(Object.keys(body).sort()).toEqual(['messages', 'model']);
  });

  // 2. Each message conforms to { role: 'user'|'assistant', content: string }
  it('message objects have only role and content with valid values', async () => {
    mockFetch().mockResolvedValue(ok(['ok']));
    const { result } = renderHook(() => useGravityClaw());
    const msgs: GCMessage[] = [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'follow-up' },
    ];
    await act(async () => { await result.current.sendMessage(msgs); });
    const body = JSON.parse(mockFetch().mock.calls[0]![1]!.body as string);
    for (const msg of body.messages) {
      expect(Object.keys(msg).sort()).toEqual(['content', 'role']);
      expect(['user', 'assistant']).toContain(msg.role);
      expect(typeof msg.content).toBe('string');
    }
  });

  // 3. Server 400 (e.g. empty messages) — error body is surfaced
  it('surfaces server 400 { error } body as thrown message', async () => {
    mockFetch().mockResolvedValue(errResp(400, { error: 'messages array is required' }));
    const { result } = renderHook(() => useGravityClaw());
    await expect(
      act(() => result.current.sendMessage([])),
    ).rejects.toThrow('messages array is required');
  });

  // 4. Server 401 (missing API key) — error body is surfaced
  it('surfaces server 401 { error } body', async () => {
    mockFetch().mockResolvedValue(errResp(401, { error: 'Missing or invalid Gemini API key.' }));
    const { result } = renderHook(() => useGravityClaw());
    await expect(
      act(() => result.current.sendMessage([{ role: 'user', content: 'x' }])),
    ).rejects.toThrow('Missing or invalid Gemini API key.');
  });

  // 5. Non-JSON error body falls back to "HTTP <status>"
  it('falls back to HTTP status when error body is not JSON', async () => {
    mockFetch().mockResolvedValue({
      ok: false, status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
    } as unknown as Response);
    const { result } = renderHook(() => useGravityClaw());
    await expect(
      act(() => result.current.sendMessage([{ role: 'user', content: 'x' }])),
    ).rejects.toThrow('HTTP 500');
  });

  // 6. AbortSignal is wired to fetch (contract for stream cancellation)
  it('passes an AbortSignal to fetch', async () => {
    mockFetch().mockResolvedValue(ok(['ok']));
    const { result } = renderHook(() => useGravityClaw());
    await act(async () => {
      await result.current.sendMessage([{ role: 'user', content: 'x' }]);
    });
    const opts = mockFetch().mock.calls[0]![1]! as RequestInit;
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  // 7. Rapid sends abort previous — only latest resolves
  it('only the latest of three rapid sends resolves', async () => {
    let callIdx = 0;
    mockFetch().mockImplementation((_url: string, opts: RequestInit) => {
      callIdx++;
      const idx = callIdx;
      return new Promise((resolve, reject) => {
        opts.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
        resolve(ok([`resp-${idx}`]));
      });
    });

    const { result } = renderHook(() => useGravityClaw());
    act(() => {
      result.current.sendMessage([{ role: 'user', content: '1' }]).catch(() => {});
      result.current.sendMessage([{ role: 'user', content: '2' }]).catch(() => {});
    });

    let last: string | undefined;
    await act(async () => {
      last = await result.current.sendMessage([{ role: 'user', content: '3' }]);
    });
    expect(last).toBe('resp-3');
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
