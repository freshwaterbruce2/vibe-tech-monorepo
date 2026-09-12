import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dataStore } = vi.hoisted(() => ({
  dataStore: { getSensoryPreferences: vi.fn(), saveSensoryPreferences: vi.fn() },
}));

vi.mock('../dataStore', () => ({ dataStore }));

import {
  applySensoryPreferences,
  initializeSensoryPreferences,
  isHapticFeedbackEnabled,
  isSoundFeedbackEnabled,
  loadSensoryPreferences,
  normalizeSensoryPreferences,
  persistSensoryPreferences,
  saveSensoryPreferences,
} from '../sensoryPreferences';
import { triggerVibration } from '../uiService';

const sensoryDefaults = {
  animationSpeed: 'normal',
  soundEnabled: true,
  hapticEnabled: true,
  fontSize: 'medium',
  dyslexiaFont: false,
  colorMode: 'default',
} as const;

describe('sensoryPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-animation-speed');
    document.documentElement.removeAttribute('data-font-size');
    document.documentElement.removeAttribute('data-color-mode');
    document.body.classList.remove('dyslexia-font');
    initializeSensoryPreferences(sensoryDefaults);
  });

  it('uses complete defaults for missing or malformed preferences', () => {
    expect(normalizeSensoryPreferences(null)).toEqual(sensoryDefaults);
    expect(normalizeSensoryPreferences('{not preferences}')).toEqual(sensoryDefaults);
    expect(normalizeSensoryPreferences({ animationSpeed: 'fast', soundEnabled: 'yes' })).toEqual(
      sensoryDefaults,
    );
  });

  it('applies all motion, typography, dyslexia, and color document effects', () => {
    applySensoryPreferences({
      animationSpeed: 'none',
      soundEnabled: false,
      hapticEnabled: true,
      fontSize: 'large',
      dyslexiaFont: true,
      colorMode: 'high-contrast',
    });

    expect(document.documentElement).toHaveAttribute('data-animation-speed', 'none');
    expect(document.documentElement).toHaveAttribute('data-font-size', 'large');
    expect(document.documentElement).toHaveAttribute('data-color-mode', 'high-contrast');
    expect(document.body).toHaveClass('dyslexia-font');
  });

  it('gates haptics globally and applies enabled changes live', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });

    triggerVibration(50);
    expect(vibrate).toHaveBeenCalledWith(50);

    applySensoryPreferences({ ...sensoryDefaults, hapticEnabled: false });
    triggerVibration([50, 30, 50]);
    expect(vibrate).toHaveBeenCalledOnce();

    applySensoryPreferences(sensoryDefaults);
    triggerVibration(20);
    expect(vibrate).toHaveBeenLastCalledWith(20);
  });

  it('gates sound globally and changes the live gate with applied preferences', () => {
    expect(isSoundFeedbackEnabled()).toBe(true);
    applySensoryPreferences({ ...sensoryDefaults, soundEnabled: false });
    expect(isSoundFeedbackEnabled()).toBe(false);
    applySensoryPreferences(sensoryDefaults);
    expect(isSoundFeedbackEnabled()).toBe(true);
  });

  it('loads a saved, validated preference shape after storage initialization', async () => {
    dataStore.getSensoryPreferences.mockResolvedValue({ ...sensoryDefaults, soundEnabled: false });

    await expect(loadSensoryPreferences()).resolves.toEqual({ ...sensoryDefaults, soundEnabled: false });
  });

  it('uses safe defaults when storage returns malformed data or rejects', async () => {
    dataStore.getSensoryPreferences.mockResolvedValue({ animationSpeed: 'none' });
    await expect(loadSensoryPreferences()).resolves.toEqual(sensoryDefaults);

    dataStore.getSensoryPreferences.mockRejectedValue(new Error('database unavailable'));
    await expect(loadSensoryPreferences()).resolves.toEqual(sensoryDefaults);
  });

  it('rejects a write that cannot be read back exactly', async () => {
    dataStore.getSensoryPreferences.mockResolvedValue(sensoryDefaults);
    dataStore.saveSensoryPreferences.mockResolvedValue(undefined);

    await expect(
      saveSensoryPreferences({ ...sensoryDefaults, soundEnabled: false }),
    ).rejects.toThrow(/could not be verified/i);
  });

  it('surfaces storage failures instead of reporting a saved preference', async () => {
    dataStore.saveSensoryPreferences.mockRejectedValue(new Error('storage unavailable'));

    await expect(saveSensoryPreferences(sensoryDefaults)).rejects.toThrow('storage unavailable');
  });

  it('rejects invalid user-initiated saves instead of converting them to defaults', async () => {
    await expect(saveSensoryPreferences({ animationSpeed: 'none' })).rejects.toThrow(
      /complete valid preference shape/i,
    );
  });

  it('keeps a newer live choice when an older deferred write fails', async () => {
    let rejectFirst: (reason?: unknown) => void = () => undefined;
    const firstWrite = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const newest = { ...sensoryDefaults, hapticEnabled: false };
    dataStore.saveSensoryPreferences
      .mockImplementationOnce(async () => firstWrite)
      .mockResolvedValueOnce(undefined);
    dataStore.getSensoryPreferences.mockResolvedValue(newest);

    const first = persistSensoryPreferences({ ...sensoryDefaults, soundEnabled: false });
    applySensoryPreferences(newest);
    const second = persistSensoryPreferences(newest);
    rejectFirst(new Error('first write failed'));

    await expect(first).resolves.toEqual({ status: 'stale-failed' });
    await expect(second).resolves.toEqual({ status: 'confirmed', prefs: newest });
    expect(document.documentElement).toHaveAttribute('data-animation-speed', 'normal');
    expect(isSoundFeedbackEnabled()).toBe(true);
    expect(isHapticFeedbackEnabled()).toBe(false);
  });

  it('treats identical successive requests as distinct ordered writes', async () => {
    let rejectFirst: (reason?: unknown) => void = () => undefined;
    const firstWrite = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    dataStore.saveSensoryPreferences
      .mockImplementationOnce(async () => firstWrite)
      .mockResolvedValueOnce(undefined);
    dataStore.getSensoryPreferences.mockResolvedValue(sensoryDefaults);

    const first = persistSensoryPreferences(sensoryDefaults);
    const second = persistSensoryPreferences(sensoryDefaults);
    rejectFirst(new Error('older identical write failed'));

    await expect(first).resolves.toEqual({ status: 'stale-failed' });
    await expect(second).resolves.toEqual({ status: 'confirmed', prefs: sensoryDefaults });
  });

  it('restores the last confirmed state when the latest write fails', async () => {
    let rejectWrite: (reason?: unknown) => void = () => undefined;
    const latestWrite = new Promise<void>((_resolve, reject) => {
      rejectWrite = reject;
    });
    const confirmed = { ...sensoryDefaults, fontSize: 'large' as const };
    initializeSensoryPreferences(confirmed);
    applySensoryPreferences({ ...confirmed, colorMode: 'warm' });
    dataStore.saveSensoryPreferences.mockImplementation(async () => latestWrite);

    const result = persistSensoryPreferences({ ...confirmed, colorMode: 'warm' });
    rejectWrite(new Error('latest write failed'));
    await expect(result).resolves.toMatchObject({ status: 'failed', prefs: confirmed });
    expect(document.documentElement).toHaveAttribute('data-font-size', 'large');
    expect(document.documentElement).toHaveAttribute('data-color-mode', 'default');
    expect(isSoundFeedbackEnabled()).toBe(true);
    expect(isHapticFeedbackEnabled()).toBe(true);
  });
});
