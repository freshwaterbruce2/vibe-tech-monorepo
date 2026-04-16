import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGravityClaw } from '../useGravityClaw';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ReadableStream that emits `chunks` sequentially. */
function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let idx = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (idx < chunks.length) {
        controller.enqueue(encoder.encode(chunks[idx]));
        idx++;
      } else {
        controller.close();
      }
    },
  });
}

/** Shorthand for a 200-OK streaming response. */
function okStreamResponse(chunks: string[]): Response {
  return {
    ok: true,
    status: 200,
    body: createMockStream(chunks),
    json: vi.fn(),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGravityClaw', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- successful streaming response ----

  it('streams chunks and returns the full concatenated response', async () => {
    const chunks = ['Hello', ' world', '!'];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okStreamResponse(chunks));

    const { result } = renderHook(() => useGravityClaw());

    const onChunk = vi.fn();
    let fullResponse: string | undefined;

    await act(async () => {
      fullResponse = await result.current.sendMessage(
        [{ role: 'user', content: 'hi' }],
        { onChunk },
      );
    });

    expect(fullResponse).toBe('Hello world!');
    expect(onChunk).toHaveBeenCalledTimes(3);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onChunk).toHaveBeenNthCalledWith(2, ' world');
    expect(onChunk).toHaveBeenNthCalledWith(3, '!');
  });

  it('sets isStreaming=true while in-flight and false when done', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okStreamResponse(['chunk']),
    );

    const { result } = renderHook(() => useGravityClaw());

    expect(result.current.isStreaming).toBe(false);

    let sendPromise: Promise<string>;
    act(() => {
      sendPromise = result.current.sendMessage([{ role: 'user', content: 'x' }]);
    });

    // During streaming isStreaming should be true
    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    await act(async () => {
      await sendPromise!;
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('sends the correct request body to the GravityClaw endpoint', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okStreamResponse(['ok']),
    );

    const { result } = renderHook(() => useGravityClaw());
    const messages = [{ role: 'user' as const, content: 'test' }];

    await act(async () => {
      await result.current.sendMessage(messages, { model: 'test-model' });
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: 'test-model' }),
      }),
    );
  });

  // ---- abort ----

  it('abort cancels in-flight request and resets isStreaming', async () => {
    // Create a stream that hangs forever (never closes)
    const hangingStream = new ReadableStream<Uint8Array>({
      start() {
        // intentionally never enqueue or close
      },
    });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: hangingStream,
    } as unknown as Response);

    const { result } = renderHook(() => useGravityClaw());

    let _error: Error | undefined;
    act(() => {
      result.current
        .sendMessage([{ role: 'user', content: 'hang' }])
        .catch((e: Error) => {
          _error = e;
        });
    });

    // Wait for streaming to start
    await waitFor(() => expect(result.current.isStreaming).toBe(true));

    // Now abort
    act(() => {
      result.current.abort();
    });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
  });

  // ---- HTTP error handling ----

  it('throws an error with status text on non-200 response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error('no json')),
    } as unknown as Response);

    const { result } = renderHook(() => useGravityClaw());

    await expect(
      act(async () =>
        result.current.sendMessage([{ role: 'user', content: 'fail' }]),
      ),
    ).rejects.toThrow('HTTP 503');
  });

  it('uses error body message when available', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      json: vi.fn().mockResolvedValue({ error: 'Rate limit exceeded' }),
    } as unknown as Response);

    const { result } = renderHook(() => useGravityClaw());

    await expect(
      act(async () =>
        result.current.sendMessage([{ role: 'user', content: 'fail' }]),
      ),
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('throws when response body is null', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    } as unknown as Response);

    const { result } = renderHook(() => useGravityClaw());

    await expect(
      act(async () =>
        result.current.sendMessage([{ role: 'user', content: 'nobody' }]),
      ),
    ).rejects.toThrow('No response body from GravityClaw');
  });

  // ---- model defaults ----

  it('exposes URL and model from env defaults', () => {
    const { result } = renderHook(() => useGravityClaw());

    // url and model come from the env fallbacks in the module
    expect(result.current.url).toBe('http://localhost:5187');
    expect(typeof result.current.model).toBe('string');
    expect(result.current.model.length).toBeGreaterThan(0);
  });

  it('uses the default model when no override is provided', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      okStreamResponse(['ok']),
    );

    const { result } = renderHook(() => useGravityClaw());

    await act(async () => {
      await result.current.sendMessage([{ role: 'user', content: 'hello' }]);
    });

    const callBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
    );
    expect(callBody.model).toBe(result.current.model);
  });

  // ---- previous request is aborted when a new one starts ----

  it('aborts previous request when sendMessage is called again', async () => {
    let callCount = 0;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (_url: string, opts: RequestInit) => {
        callCount++;
        // First call hangs; second resolves normally
        if (callCount === 1) {
          return new Promise((_resolve, reject) => {
            opts.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          });
        }
        return okStreamResponse(['done']);
      },
    );

    const { result } = renderHook(() => useGravityClaw());

    // Fire first request (will hang)
    let _firstError: Error | undefined;
    act(() => {
      result.current
        .sendMessage([{ role: 'user', content: 'first' }])
        .catch((e: Error) => {
          _firstError = e;
        });
    });

    // Fire second request -- should abort the first
    let secondResult: string | undefined;
    await act(async () => {
      secondResult = await result.current.sendMessage([
        { role: 'user', content: 'second' },
      ]);
    });

    expect(secondResult).toBe('done');
    // The first fetch should have been called with an AbortSignal
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
