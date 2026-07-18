import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getApiKey = vi.fn();
const initializeAllProviders = vi.fn().mockResolvedValue(undefined);
const initializeProvider = vi.fn().mockResolvedValue(undefined);
const syncStoredApiKeysToBackend = vi.fn().mockResolvedValue(undefined);
const getDatabase = vi.fn();
const getDbInitError = vi.fn(() => null);
const logEvent = vi.fn().mockResolvedValue(undefined);
const migrateStrategyMemory = vi.fn().mockResolvedValue({ migrated: 0 });
const getSetting = vi.fn();

vi.mock('@vibetech/core', () => ({
  SecureApiKeyManager: { getInstance: () => ({ getApiKey }) },
}));
vi.mock('../../../services/ai/AIProviderFactory', () => ({
  AIProviderFactory: {
    getInstance: () => ({ initializeAllProviders, initializeProvider }),
  },
}));
vi.mock('../../../services/ai/backendKeySync', () => ({
  syncStoredApiKeysToBackend,
  pushApiKeyToBackend: vi.fn(),
}));
vi.mock('../../../modules/core/services/DatabaseManager', () => ({
  getDatabase: () => getDatabase(),
  getDbInitError: () => getDbInitError(),
}));
vi.mock('../../../services/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../services/TelemetryService', () => ({
  telemetry: { trackEvent: vi.fn() },
}));

describe('boot hooks coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiKey.mockResolvedValue('key');
    getDatabase.mockResolvedValue({
      getSetting,
      logEvent,
      migrateStrategyMemory,
    });
    getSetting.mockResolvedValue('ok');
    getDbInitError.mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('useApiKeyLoader sets the openrouter key from the manager', async () => {
    getApiKey.mockResolvedValue('or-key');
    const setOpenrouterApiKey = vi.fn();
    const { useApiKeyLoader } = await import('../useApiKeyLoader');

    await act(async () => {
      renderHook(() => useApiKeyLoader({ setOpenrouterApiKey }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getApiKey).toHaveBeenCalledWith('openrouter');
    expect(setOpenrouterApiKey).toHaveBeenCalledWith('or-key');
  });

  it('useApiKeyLoader swallows manager failures', async () => {
    getApiKey.mockRejectedValue(new Error('no store'));
    const setOpenrouterApiKey = vi.fn();
    const { useApiKeyLoader } = await import('../useApiKeyLoader');

    await act(async () => {
      renderHook(() => useApiKeyLoader({ setOpenrouterApiKey }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setOpenrouterApiKey).not.toHaveBeenCalled();
  });

  it('useDatabaseInit marks ready and logs analytics', async () => {
    migrateStrategyMemory.mockResolvedValue({ migrated: 2 });
    const setDbStatus = vi.fn();
    const showWarning = vi.fn();
    const showError = vi.fn();
    vi.resetModules();
    const { useDatabaseInit } = await import('../useDatabaseInit');

    renderHook(() => useDatabaseInit({ setDbStatus, showWarning, showError }));

    await waitFor(() => {
      expect(setDbStatus).toHaveBeenCalledWith('ready');
    });
    expect(setDbStatus).toHaveBeenCalledWith('initializing');
    expect(logEvent).toHaveBeenCalled();
    expect(migrateStrategyMemory).toHaveBeenCalled();
  });

  it('useDatabaseInit falls back when settings read fails', async () => {
    getSetting.mockRejectedValue(new Error('fallback'));
    const setDbStatus = vi.fn();
    const showWarning = vi.fn();
    const showError = vi.fn();
    vi.resetModules();
    const { useDatabaseInit } = await import('../useDatabaseInit');

    renderHook(() => useDatabaseInit({ setDbStatus, showWarning, showError }));

    await waitFor(() => {
      expect(setDbStatus).toHaveBeenCalledWith('fallback');
    });
    expect(showWarning).toHaveBeenCalled();
  });

  it('useDatabaseInit reports critical init failure', async () => {
    getDatabase.mockRejectedValue(new Error('db down'));
    const setDbStatus = vi.fn();
    const showWarning = vi.fn();
    const showError = vi.fn();
    vi.resetModules();
    const { useDatabaseInit } = await import('../useDatabaseInit');

    renderHook(() => useDatabaseInit({ setDbStatus, showWarning, showError }));

    await waitFor(() => {
      expect(setDbStatus).toHaveBeenCalledWith('fallback');
    });
    expect(showError).toHaveBeenCalledWith('Database Error', expect.any(String));
  });

  it('useDatabaseInit swallows analytics and migration failures', async () => {
    logEvent.mockRejectedValue(new Error('analytics down'));
    migrateStrategyMemory.mockRejectedValue(new Error('migration down'));
    const setDbStatus = vi.fn();
    vi.resetModules();
    const { useDatabaseInit } = await import('../useDatabaseInit');

    renderHook(() => useDatabaseInit({ setDbStatus, showWarning: vi.fn(), showError: vi.fn() }));

    await waitFor(() => {
      expect(setDbStatus).toHaveBeenCalledWith('ready');
    });
  });

  it('useDatabaseInit outer catch handles initDatabase rejection', async () => {
    // Force initDatabase promise to reject after getDatabase returns a broken API
    getDatabase.mockResolvedValue({
      getSetting: () => {
        throw new Error('sync blowup');
      },
      logEvent,
      migrateStrategyMemory,
    });
    // make initDatabase itself throw outside try by mocking getDatabase to throw after timeout path:
    // Actually the .catch on line 91 only runs if initDatabase rejects without internal catch.
    // initDatabase catches all - so make the catch rethrow path by mocking module...
    // Simpler: make getDatabase return then setDbStatus throw on first call after init.
    const setDbStatus = vi.fn();
    // First call is initializing - ok. Second throws to reject the async function before catch? No - it's in try.
    // The only way to hit .catch is if initDatabase throws outside its try/catch - it can't.
    // Or if something weird happens. Looking at code - initDatabase never rejects because catch is internal.
    // Wait - setTimeout callback is: initDatabase(...).catch(...) - initDatabase always resolves.
    // Unless we change initDatabase... Actually if setDbStatus throws on 'initializing' before try?
    // setDbStatus('initializing') is before try - if it throws, the promise rejects!
    setDbStatus.mockImplementation((status: string) => {
      if (status === 'initializing') {
        throw new Error('setter boom');
      }
    });
    vi.resetModules();
    const { useDatabaseInit } = await import('../useDatabaseInit');

    renderHook(() => useDatabaseInit({ setDbStatus, showWarning: vi.fn(), showError: vi.fn() }));

    await waitFor(() => {
      expect(setDbStatus).toHaveBeenCalledWith('fallback');
    });
  });

  it('useAppInit registers electron auto-open-folder and cleans up', async () => {
    const on = vi.fn();
    const removeListener = vi.fn();
    (
      globalThis as unknown as {
        electron: { on: typeof on; removeListener: typeof removeListener };
      }
    ).electron = { on, removeListener };

    const handleOpenFolder = vi.fn().mockResolvedValue(undefined);
    const handleOpenFile = vi.fn().mockResolvedValue(undefined);
    const { useAppInit } = await import('../useAppInit');

    const { unmount } = renderHook(() =>
      useAppInit({
        showWarning: vi.fn(),
        handleOpenFolder,
        handleOpenFile,
      })
    );

    expect(on).toHaveBeenCalledWith('auto-open-folder', expect.any(Function));
    const handler = on.mock.calls[0][1] as (path: string) => void;
    await act(async () => {
      handler('D:/ws');
      await Promise.resolve();
    });
    expect(handleOpenFolder).toHaveBeenCalledWith('D:/ws');

    // Cover handleOpenFolder rejection handler
    handleOpenFolder.mockRejectedValueOnce(new Error('open failed'));
    await act(async () => {
      handler('D:/bad');
      await Promise.resolve();
      await Promise.resolve();
    });

    unmount();
    expect(removeListener).toHaveBeenCalledWith('auto-open-folder', handler);

    delete (globalThis as unknown as { electron?: unknown }).electron;
  });

  it('useAIProviderInit direct mode re-inits moonshot/google/deepseek on key update', async () => {
    vi.stubEnv('VITE_USE_AI_PROXY', 'false');
    vi.resetModules();
    getApiKey.mockResolvedValue('k');

    const { useAIProviderInit } = await import('../useAIProviderInit');

    await act(async () => {
      renderHook(() => useAIProviderInit());
      await Promise.resolve();
      await Promise.resolve();
    });

    for (const provider of ['moonshot', 'google', 'deepseek'] as const) {
      await act(async () => {
        window.dispatchEvent(new CustomEvent('apiKeyUpdated', { detail: { provider } }));
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    expect(initializeProvider).toHaveBeenCalled();

    // Cover reinit catch path when provider init throws
    initializeProvider.mockRejectedValueOnce(new Error('reinit failed'));
    await act(async () => {
      window.dispatchEvent(new CustomEvent('apiKeyUpdated', { detail: { provider: 'moonshot' } }));
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it('useKeyboardShortcuts opens help chord and toggles terminal closed', async () => {
    const handlers = {
      setGlobalSearchOpen: vi.fn(),
      setAiChatOpen: vi.fn(),
      setChatMode: vi.fn(),
      setKeyboardShortcutsOpen: vi.fn(),
      setTerminalOpen: vi.fn(),
      terminalOpen: true,
      setGitPanelOpen: vi.fn(),
      toggleCommandPalette: vi.fn(),
    };
    const { useKeyboardShortcuts } = await import('../useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(handlers));

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }));
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 's' }));
    expect(handlers.setKeyboardShortcutsOpen).toHaveBeenCalledWith(true);

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '`' }));
    expect(handlers.setTerminalOpen).toHaveBeenCalledWith(false);
  });
});
