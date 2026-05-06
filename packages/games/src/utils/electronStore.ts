import { getConfiguredGamesHostBridge } from '../core/hostBridge';

const memoryStore = new Map<string, unknown>();

function readLocalStorage<T>(key: string): T | undefined {
  if (typeof globalThis.localStorage === 'undefined') return undefined;

  const raw = globalThis.localStorage.getItem(key);
  if (raw === null) return undefined;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

function writeLocalStorage(key: string, value: unknown): void {
  if (typeof globalThis.localStorage === 'undefined') return;
  globalThis.localStorage.setItem(key, JSON.stringify(value));
}

export const appStore = {
  get<T = unknown>(key: string): T | undefined {
    const bridgeValue = getConfiguredGamesHostBridge().loadConfig?.<T>(key);
    if (bridgeValue !== undefined) return bridgeValue;

    const localValue = readLocalStorage<T>(key);
    if (localValue !== undefined) return localValue;

    return memoryStore.get(key) as T | undefined;
  },

  set(key: string, value: unknown): void {
    getConfiguredGamesHostBridge().saveConfig?.(key, value);
    memoryStore.set(key, value);
    writeLocalStorage(key, value);
  },
};
