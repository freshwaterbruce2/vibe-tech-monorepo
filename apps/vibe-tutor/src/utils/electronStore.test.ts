import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./logger', () => ({ logger: { error: vi.fn() } }));

import {
  appStore,
  getStorageFailureSnapshot,
  sessionStore,
  subscribeToStorageFailures,
} from './electronStore';

const persistentValues = new Map<string, string>();
let originalElectronApi: Window['electronAPI'];

function installBridge(isElectron = false) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      isElectron,
      store: {
        get: (key: string) => persistentValues.get(key) ?? null,
        set: (key: string, value: unknown) => persistentValues.set(key, String(value)),
        delete: (key: string) => persistentValues.delete(key),
        clear: () => persistentValues.clear(),
      },
    },
  });
}

function captureFailures() {
  const failures: ReturnType<typeof getStorageFailureSnapshot>[] = [];
  const unsubscribe = subscribeToStorageFailures(() => failures.push(getStorageFailureSnapshot()));
  return { failures, unsubscribe };
}

describe('electronStore storage failure signal', () => {
  beforeEach(() => {
    originalElectronApi = window.electronAPI;
    persistentValues.clear();
    sessionStorage.clear();
    installBridge();
  });

  afterEach(() => {
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: originalElectronApi });
  });

  it('returns strict values and propagates strict persistent read and write failures', () => {
    appStore.setStrict('ledger', { version: 3, balance: 4 });
    expect(appStore.getStrict('ledger')).toEqual({ version: 3, balance: 4 });
    const bridge = window.electronAPI.store;
    bridge.get = vi.fn(() => { throw new Error('unavailable'); });
    expect(() => appStore.getStrict('ledger')).toThrow('unavailable');
    bridge.set = vi.fn(() => { throw new Error('unavailable'); });
    expect(() => appStore.setStrict('ledger', { version: 3 })).toThrow('unavailable');
  });

  it('emits content-free persistent read failures for an unavailable or malformed bridge', () => {
    Object.defineProperty(window, 'electronAPI', { configurable: true, value: { isElectron: false } });
    const { failures, unsubscribe } = captureFailures();

    expect(appStore.get('private-key')).toBeNull();

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ store: 'persistent', operation: 'read', reason: 'unavailable' });
    expect(JSON.stringify(failures[0])).not.toContain('private-key');
    unsubscribe();
  });

  it('emits distinct categorical events for persistent read, non-quota write, quota write, serialization, and delete failures', () => {
    const { failures, unsubscribe } = captureFailures();
    const bridge = window.electronAPI.store;
    bridge.get = vi.fn(() => { throw new Error('secret read error'); });
    appStore.get('secret-read-key');
    bridge.get = () => null;
    bridge.set = vi.fn(() => { throw new Error('secret write error'); });
    appStore.set('secret-write-key', 'secret-value');
    bridge.set = vi.fn(() => { throw new DOMException('full', 'QuotaExceededError'); });
    appStore.set('quota-key', 'secret-value');
    bridge.set = vi.fn();
    const circular: { self?: unknown } = {};
    circular.self = circular;
    appStore.set('circular-key', circular);
    appStore.set('undefined-key', undefined);
    bridge.delete = vi.fn(() => { throw new Error('secret delete error'); });
    appStore.delete('secret-delete-key');

    expect(failures.map((failure) => [failure?.operation, failure?.reason])).toEqual([
      ['read', 'unavailable'],
      ['write', 'unavailable'],
      ['write', 'quota'],
      ['write', 'unavailable'],
      ['write', 'unavailable'],
      ['delete', 'unavailable'],
    ]);
    expect(new Set(failures.map((failure) => failure?.id)).size).toBe(failures.length);
    expect(JSON.stringify(failures)).not.toMatch(/secret-|quota-key|circular-key|undefined-key|secret-value/);
    unsubscribe();
  });

  it('emits no event for successful persistent operations', () => {
    const { failures, unsubscribe } = captureFailures();

    appStore.set('safe-key', 'value');
    expect(appStore.get('safe-key')).toBe('value');
    appStore.delete('safe-key');

    expect(failures).toEqual([]);
    unsubscribe();
  });

  it('notifies multiple listeners, isolates a failing listener, and honors unsubscribe', () => {
    const failingListener = vi.fn(() => { throw new Error('listener failure'); });
    const healthyListener = vi.fn();
    const unsubscribeFailing = subscribeToStorageFailures(failingListener);
    const unsubscribeHealthy = subscribeToStorageFailures(healthyListener);
    window.electronAPI.store.set = vi.fn(() => { throw new Error('write failure'); });

    appStore.set('key', 'value');
    unsubscribeHealthy();
    appStore.set('key', 'value');

    expect(failingListener).toHaveBeenCalledTimes(2);
    expect(healthyListener).toHaveBeenCalledTimes(1);
    unsubscribeFailing();
  });

  it('emits representative session read, quota-write, and delete failures', () => {
    installBridge(true);
    const { failures, unsubscribe } = captureFailures();
    const bridge = window.electronAPI.store;
    bridge.get = vi.fn(() => { throw new Error('session read failure'); });
    sessionStore.get('session-secret');
    bridge.set = vi.fn(() => { throw new DOMException('full', 'QuotaExceededError'); });
    sessionStore.set('session-secret', 'value');
    bridge.delete = vi.fn(() => { throw new Error('session delete failure'); });
    sessionStore.delete('session-secret');

    expect(failures.map((failure) => [failure?.store, failure?.operation, failure?.reason])).toEqual([
      ['session', 'read', 'unavailable'],
      ['session', 'write', 'quota'],
      ['session', 'delete', 'unavailable'],
    ]);
    unsubscribe();
  });
});

describe('non-Electron localStorage bridge', () => {
  it('provides real storage without fabricating Electron-only import methods', () => {
    expect(window.electronAPI.isElectron).toBe(false);
    expect(window.electronAPI.selectImportFile).toBeUndefined();
    expect(window.electronAPI.ingestAndroidExport).toBeUndefined();
  });
});
