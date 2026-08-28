/**
 * Backend key sync — completes the key-custody loop.
 *
 * Settings save API keys into SecureApiKeyManager (encrypted Tauri store), but
 * in proxy mode every AI call goes through the local sidecar, which injects a
 * SERVER-side key. This module pushes saved keys to the sidecar's in-memory
 * custody endpoint (loopback-only) so chat/agents work in installed builds
 * without requiring OS env vars.
 */
import { logger } from '../Logger';

const KEYS_ENDPOINT = 'http://localhost:5004/api/ai/keys';

/** Providers the sidecar proxy understands. */
const PROXY_PROVIDERS = new Set(['openrouter', 'moonshot', 'google']);

interface KeyManagerLike {
  getStoredProviders(): Promise<{ provider: string }[]>;
  getApiKey(provider: string): Promise<string | null>;
}

/** Push one provider key to the sidecar. Resolves true when accepted. */
export async function pushApiKeyToBackend(provider: string, key: string): Promise<boolean> {
  const normalized = provider.toLowerCase();
  if (!PROXY_PROVIDERS.has(normalized)) return false;
  try {
    const res = await fetch(KEYS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: normalized, key }),
    });
    if (!res.ok) {
      logger.warn(`[backendKeySync] Sidecar rejected ${normalized} key (HTTP ${res.status})`);
      return false;
    }
    logger.info(`[backendKeySync] Synced ${normalized} key to sidecar`);
    return true;
  } catch (err) {
    logger.warn(
      `[backendKeySync] Could not reach sidecar to sync ${normalized} key: ${String(err)}`
    );
    return false;
  }
}

/**
 * Push every stored key to the sidecar. Retries a few times on boot because
 * the sidecar may still be starting when the webview mounts.
 */
export async function syncStoredApiKeysToBackend(
  keyManager: KeyManagerLike,
  retries = 3,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const stored = await keyManager.getStoredProviders();
      const relevant = stored.filter(s => PROXY_PROVIDERS.has(s.provider.toLowerCase()));
      if (relevant.length === 0) return;

      let allOk = true;
      for (const { provider } of relevant) {
        const key = await keyManager.getApiKey(provider);
        if (!key) continue;
        const ok = await pushApiKeyToBackend(provider, key);
        allOk = allOk && ok;
      }
      if (allOk) return;
    } catch (err) {
      logger.warn(`[backendKeySync] Boot sync attempt ${attempt + 1} failed: ${String(err)}`);
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
