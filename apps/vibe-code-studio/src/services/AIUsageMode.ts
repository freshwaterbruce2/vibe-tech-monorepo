import { isTauri } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';

export type AIUsageMode = 'byok' | 'subscription';
export const AI_USAGE_MODE_KEY = 'aiUsageMode';
let savedMode: AIUsageMode = 'byok';
// Funding is set before the app mounts, then remains fixed for this launch.
export let activeAIUsageMode: AIUsageMode = 'byok';
const localByokProxy =
  import.meta.env['VITE_USE_AI_PROXY'] === 'true' &&
  (!import.meta.env['VITE_BACKEND_URL'] ||
    import.meta.env['VITE_BACKEND_URL'].replace(/\/$/, '') === 'http://localhost:5004');
export let useAIProxy = localByokProxy;

export async function initializeAIUsageMode(): Promise<void> {
  if (!isTauri()) return;
  const store = await load('ai-preferences.json', { defaults: {}, autoSave: false });
  const value = await store.get<AIUsageMode>(AI_USAGE_MODE_KEY);
  if (value !== undefined && value !== 'byok' && value !== 'subscription') {
    throw new Error('Your AI payment preference could not be read. AI has not been started.');
  }
  savedMode = value ?? 'byok';
  activeAIUsageMode = savedMode;
  useAIProxy = activeAIUsageMode === 'subscription' || localByokProxy;
}

export function getSavedAIUsageMode(): AIUsageMode {
  return savedMode;
}

export async function saveAIUsageMode(mode: AIUsageMode): Promise<void> {
  if (!isTauri()) throw new Error('Changing the AI payment option requires the desktop app.');
  const store = await load('ai-preferences.json', { defaults: {}, autoSave: false });
  await store.set(AI_USAGE_MODE_KEY, mode);
  await store.save();
  savedMode = mode;
}

export function validateBackendUrl(value: string): string {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('Backend URL must be an HTTPS origin (HTTP is allowed only for loopback).');
  }
  return url.origin;
}

export const backendBaseUrl = validateBackendUrl(
  import.meta.env['VITE_BACKEND_URL'] || 'http://localhost:5004'
);
