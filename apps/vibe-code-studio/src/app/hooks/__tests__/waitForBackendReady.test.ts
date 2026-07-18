import { describe, expect, it, vi } from 'vitest';

import { isBackendHealthReady, pollBackendHealth, waitForBackendReady } from '../useAppEffects';

describe('isBackendHealthReady', () => {
  it('returns false when response is not ok', async () => {
    const res = new Response('nope', { status: 503 });
    await expect(isBackendHealthReady(res, false)).resolves.toBe(false);
  });

  it('returns true when a provider is configured', async () => {
    const res = new Response(JSON.stringify({ configured: { openrouter: true } }), {
      status: 200,
    });
    await expect(isBackendHealthReady(res, false)).resolves.toBe(true);
  });

  it('returns false when configured is empty and more attempts remain', async () => {
    const res = new Response(JSON.stringify({ configured: {} }), { status: 200 });
    await expect(isBackendHealthReady(res, false)).resolves.toBe(false);
  });

  it('returns true when configured is empty on the last attempt', async () => {
    const res = new Response(JSON.stringify({ configured: { x: false } }), { status: 200 });
    await expect(isBackendHealthReady(res, true)).resolves.toBe(true);
  });

  it('returns true for non-JSON 200 bodies', async () => {
    const res = new Response('ok', { status: 200 });
    await expect(isBackendHealthReady(res, false)).resolves.toBe(true);
  });
});

describe('pollBackendHealth', () => {
  it('returns true when health reports configured keys', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ configured: { openrouter: true } }), { status: 200 })
      );
    await expect(pollBackendHealth(2, 1, fetchImpl as typeof fetch)).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('returns false when all attempts fail', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'));
    await expect(pollBackendHealth(2, 1, fetchImpl as typeof fetch)).resolves.toBe(false);
  });
});

describe('waitForBackendReady under Vitest', () => {
  it('runs a single failed poll (no sidecar) and returns false', async () => {
    await expect(waitForBackendReady(1, 1)).resolves.toBe(false);
  });
});
