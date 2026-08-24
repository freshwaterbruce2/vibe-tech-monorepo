import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The demo workspace must load ONLY in a plain browser (web preview). On the
 * desktop build (Tauri exposes `__TAURI_INTERNALS__`; Electron sets
 * `__ELECTRON__` / `window.electron.isElectron`) the app must NOT auto-open the
 * fabricated demo:// files — the user opens a real folder. Regression guard for
 * the "packaged app shows fake files" bug (old gate checked a never-set
 * `electronAPI`).
 */
vi.mock('../../../services/TelemetryService', () => ({
  telemetry: { trackEvent: vi.fn() },
}));
vi.mock('../../../services/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../../modules/core/services/DatabaseManager', () => ({
  getDatabase: vi.fn(),
  getDbInitError: vi.fn(() => null),
}));

const DESKTOP_GLOBALS = ['__TAURI_INTERNALS__', '__ELECTRON__', 'electron'] as const;

function clearDesktopGlobals() {
  for (const key of DESKTOP_GLOBALS) {
    delete (window as unknown as Record<string, unknown>)[key];
  }
}

async function mountAppInit() {
  const handleOpenFolder = vi.fn().mockResolvedValue(undefined);
  const handleOpenFile = vi.fn().mockResolvedValue(undefined);
  const showWarning = vi.fn();
  const { useAppInit } = await import('../useAppEffects');
  renderHook(() => useAppInit({ showWarning, handleOpenFolder, handleOpenFile }));
  return { handleOpenFolder, handleOpenFile };
}

describe('useAppInit — demo workspace gate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clearDesktopGlobals();
  });

  afterEach(() => {
    clearDesktopGlobals();
    vi.useRealTimers();
  });

  it('loads the demo workspace in a plain browser (no desktop globals)', async () => {
    vi.useFakeTimers();
    let handles!: Awaited<ReturnType<typeof mountAppInit>>;
    await act(async () => {
      handles = await mountAppInit();
    });

    expect(handles.handleOpenFolder).toHaveBeenCalledWith('demo://workspace');
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(handles.handleOpenFile).toHaveBeenCalledWith('demo://workspace/index.js');
  });

  it('does NOT load the demo workspace under Tauri', async () => {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
    let handles!: Awaited<ReturnType<typeof mountAppInit>>;
    await act(async () => {
      handles = await mountAppInit();
    });
    expect(handles.handleOpenFolder).not.toHaveBeenCalled();
    expect(handles.handleOpenFile).not.toHaveBeenCalled();
  });

  it('does NOT load the demo workspace under Electron (window.electron.isElectron)', async () => {
    (window as unknown as Record<string, unknown>)['electron'] = { isElectron: true };
    let handles!: Awaited<ReturnType<typeof mountAppInit>>;
    await act(async () => {
      handles = await mountAppInit();
    });
    expect(handles.handleOpenFolder).not.toHaveBeenCalled();
  });
});
