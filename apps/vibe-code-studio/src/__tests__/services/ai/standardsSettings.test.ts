/**
 * standardsSettings tests — spec 03 AC #10 toggle persistence.
 *
 * Covers defaults, electron-store and localStorage persistence paths,
 * partial/garbage payload sanitizing, load/persist failure tolerance,
 * the memory cache short-circuit, subscriber notify/unsubscribe (including
 * a throwing listener), and the test reset seam.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStandardsSettings,
  loadStandardsSettings,
  resetStandardsSettingsForTests,
  setStandardsSetting,
  STANDARDS_SETTINGS_STORAGE_KEY,
  type StandardsSettings,
  subscribeStandardsSettings,
} from '../../../services/ai/standards/standardsSettings';
import { logger } from '../../../services/Logger';

const ALL_ON: StandardsSettings = { agentsMd: true, projectRules: true, agentsMdCommands: true };

type ElectronWindow = { electron?: { store?: Record<string, unknown> } };
const win = window as unknown as ElectronWindow;

beforeEach(() => {
  // Global setup mocks window.electron.store with a file-lifetime Map that
  // never clears — drop it so each test starts from a clean localStorage.
  delete win.electron;
  localStorage.clear();
  resetStandardsSettingsForTests();
  vi.restoreAllMocks();
});

describe('standardsSettings — defaults and loading', () => {
  it('getStandardsSettings returns all-on defaults before any load', () => {
    expect(getStandardsSettings()).toEqual(ALL_ON);
  });

  it('loads defaults when nothing is persisted', async () => {
    await expect(loadStandardsSettings()).resolves.toEqual(ALL_ON);
    expect(getStandardsSettings()).toEqual(ALL_ON);
  });

  it('loads persisted values from localStorage and caches them', async () => {
    localStorage.setItem(
      STANDARDS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ agentsMd: false, projectRules: true, agentsMdCommands: false })
    );

    const loaded = await loadStandardsSettings();

    expect(loaded).toEqual({ agentsMd: false, projectRules: true, agentsMdCommands: false });
    // Cached: a second load skips the store even after it changes underneath.
    localStorage.setItem(STANDARDS_SETTINGS_STORAGE_KEY, JSON.stringify(ALL_ON));
    await expect(loadStandardsSettings()).resolves.toEqual({
      agentsMd: false,
      projectRules: true,
      agentsMdCommands: false,
    });
  });

  it('prefers window.electron.store when available', async () => {
    const get = vi.fn(async () => JSON.stringify({ agentsMd: false }));
    win.electron = { store: { get, set: vi.fn(async () => undefined) } };

    const loaded = await loadStandardsSettings();

    expect(get).toHaveBeenCalledWith(STANDARDS_SETTINGS_STORAGE_KEY);
    expect(loaded).toEqual({ agentsMd: false, projectRules: true, agentsMdCommands: true });
  });

  it('falls back to defaults when the electron store returns nothing', async () => {
    win.electron = { store: { get: vi.fn(async () => undefined) } };

    await expect(loadStandardsSettings()).resolves.toEqual(ALL_ON);
  });

  it('sanitizes partial and non-boolean persisted payloads', async () => {
    localStorage.setItem(
      STANDARDS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ agentsMd: 'nope', projectRules: false, unrelated: 1 })
    );

    await expect(loadStandardsSettings()).resolves.toEqual({
      agentsMd: true,
      projectRules: false,
      agentsMdCommands: true,
    });
  });

  it('sanitizes a persisted null payload to defaults', async () => {
    localStorage.setItem(STANDARDS_SETTINGS_STORAGE_KEY, 'null');

    await expect(loadStandardsSettings()).resolves.toEqual(ALL_ON);
  });

  it('recovers to defaults (and logs) when the persisted value is not JSON', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    localStorage.setItem(STANDARDS_SETTINGS_STORAGE_KEY, '{ broken');

    await expect(loadStandardsSettings()).resolves.toEqual(ALL_ON);
    expect(errorSpy).toHaveBeenCalledWith(
      '[standardsSettings] Failed to load settings',
      expect.any(Error)
    );
  });
});

describe('standardsSettings — setStandardsSetting', () => {
  it('updates memory, persists, and notifies subscribers', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStandardsSettings(listener);

    const updated = await setStandardsSetting('agentsMd', false);

    expect(updated).toEqual({ ...ALL_ON, agentsMd: false });
    expect(getStandardsSettings()).toEqual({ ...ALL_ON, agentsMd: false });
    expect(listener).toHaveBeenCalledWith({ ...ALL_ON, agentsMd: false });
    expect(JSON.parse(localStorage.getItem(STANDARDS_SETTINGS_STORAGE_KEY) ?? '{}')).toEqual({
      ...ALL_ON,
      agentsMd: false,
    });

    unsubscribe();
    await setStandardsSetting('agentsMd', true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('writes through window.electron.store when available', async () => {
    const set = vi.fn(async () => undefined);
    win.electron = { store: { get: vi.fn(async () => undefined), set } };

    await setStandardsSetting('projectRules', false);

    expect(set).toHaveBeenCalledWith(
      STANDARDS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...ALL_ON, projectRules: false })
    );
  });

  it('keeps the in-memory value and logs when persisting fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    win.electron = {
      store: {
        get: vi.fn(async () => undefined),
        set: vi.fn(async () => {
          throw new Error('store boom');
        }),
      },
    };

    const updated = await setStandardsSetting('agentsMdCommands', false);

    expect(updated.agentsMdCommands).toBe(false);
    expect(getStandardsSettings().agentsMdCommands).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      '[standardsSettings] Failed to persist settings',
      expect.any(Error)
    );
  });

  it('a throwing listener is logged and does not break other listeners', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    subscribeStandardsSettings(() => {
      throw new Error('listener boom');
    });
    const second = vi.fn();
    subscribeStandardsSettings(second);

    await setStandardsSetting('agentsMd', false);

    expect(errorSpy).toHaveBeenCalledWith('[standardsSettings] Listener failed', expect.any(Error));
    expect(second).toHaveBeenCalledWith({ ...ALL_ON, agentsMd: false });
  });

  it('degrades to memory-only when no storage surface exists at all', async () => {
    vi.stubGlobal('localStorage', undefined);
    try {
      await expect(loadStandardsSettings()).resolves.toEqual(ALL_ON);
      const updated = await setStandardsSetting('agentsMd', false);
      expect(updated.agentsMd).toBe(false);
      expect(getStandardsSettings().agentsMd).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('resetStandardsSettingsForTests drops cache and subscribers', async () => {
    const listener = vi.fn();
    subscribeStandardsSettings(listener);
    await setStandardsSetting('agentsMd', false);
    expect(listener).toHaveBeenCalledTimes(1);

    resetStandardsSettingsForTests();
    localStorage.clear();

    expect(getStandardsSettings()).toEqual(ALL_ON);
    await setStandardsSetting('projectRules', false);
    expect(listener).toHaveBeenCalledTimes(1); // subscriber was cleared
  });
});
