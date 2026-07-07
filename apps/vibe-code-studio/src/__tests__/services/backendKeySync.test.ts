/**
 * backendKeySync — the client half of the v1.2.1 key-custody loop.
 *
 * Settings store keys in SecureApiKeyManager, but in proxy mode the sidecar
 * injects SERVER-side keys, so stored keys must be pushed to its loopback
 * custody endpoint. These tests lock the push/normalization/retry contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  pushApiKeyToBackend,
  syncStoredApiKeysToBackend,
} from '../../services/ai/backendKeySync';

const ENDPOINT = 'http://localhost:5004/api/ai/keys';

function okResponse(): Response {
  return { ok: true, status: 200 } as unknown as Response;
}
function errResponse(status: number): Response {
  return { ok: false, status } as unknown as Response;
}

function makeKeyManager(
  providers: string[],
  keys: Record<string, string | null>
) {
  return {
    getStoredProviders: vi.fn().mockResolvedValue(providers.map(provider => ({ provider }))),
    getApiKey: vi.fn(async (p: string) => keys[p] ?? null),
  };
}

describe('pushApiKeyToBackend', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(okResponse());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs the normalized provider + key to the custody endpoint', async () => {
    const ok = await pushApiKeyToBackend('OpenRouter', 'sk-or-123');
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openrouter', key: 'sk-or-123' }),
      })
    );
  });

  it('refuses providers the sidecar proxy does not understand (no request)', async () => {
    const ok = await pushApiKeyToBackend('anthropic', 'sk-ant-123');
    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns false when the sidecar rejects the key', async () => {
    vi.mocked(global.fetch).mockResolvedValue(errResponse(403));
    expect(await pushApiKeyToBackend('moonshot', 'k')).toBe(false);
  });

  it('returns false (not throws) when the sidecar is unreachable', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(pushApiKeyToBackend('google', 'k')).resolves.toBe(false);
  });
});

describe('syncStoredApiKeysToBackend', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(okResponse());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes every stored proxy-provider key once and skips missing keys', async () => {
    const mgr = makeKeyManager(['openrouter', 'moonshot', 'google', 'anthropic'], {
      openrouter: 'or-key',
      moonshot: null, // stored provider but key vanished — skipped, not fatal
      google: 'g-key',
      anthropic: 'ant-key', // not a proxy provider — filtered before key lookup
    });

    await syncStoredApiKeysToBackend(mgr, 0, 0);

    const bodies = vi.mocked(global.fetch).mock.calls.map(c => JSON.parse(c[1]?.body as string));
    expect(bodies).toEqual([
      { provider: 'openrouter', key: 'or-key' },
      { provider: 'google', key: 'g-key' },
    ]);
    expect(mgr.getApiKey).not.toHaveBeenCalledWith('anthropic');
  });

  it('returns immediately when nothing relevant is stored', async () => {
    const mgr = makeKeyManager(['anthropic'], { anthropic: 'x' });
    await syncStoredApiKeysToBackend(mgr, 3, 0);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mgr.getStoredProviders).toHaveBeenCalledTimes(1); // no retries
  });

  it('retries when a push fails, then stops once all keys are accepted', async () => {
    const mgr = makeKeyManager(['openrouter'], { openrouter: 'or-key' });
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errResponse(500)) // attempt 1 rejected
      .mockResolvedValue(okResponse()); // attempt 2 accepted

    await syncStoredApiKeysToBackend(mgr, 3, 0);

    expect(vi.mocked(global.fetch).mock.calls.length).toBe(2);
    expect(mgr.getStoredProviders).toHaveBeenCalledTimes(2);
  });

  it('survives a key-manager crash on one attempt and retries', async () => {
    const mgr = makeKeyManager(['openrouter'], { openrouter: 'or-key' });
    mgr.getStoredProviders
      .mockRejectedValueOnce(new Error('store locked'))
      .mockResolvedValue([{ provider: 'openrouter' }]);

    await syncStoredApiKeysToBackend(mgr, 2, 0);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][1]?.body).toBe(
      JSON.stringify({ provider: 'openrouter', key: 'or-key' })
    );
  });

  it('gives up after exhausting retries without throwing', async () => {
    const mgr = makeKeyManager(['openrouter'], { openrouter: 'or-key' });
    vi.mocked(global.fetch).mockResolvedValue(errResponse(500));

    await expect(syncStoredApiKeysToBackend(mgr, 2, 0)).resolves.toBeUndefined();
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(3); // 1 + 2 retries
  });
});
