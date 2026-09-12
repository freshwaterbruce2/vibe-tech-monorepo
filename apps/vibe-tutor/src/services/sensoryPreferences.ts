import type { SensoryPreferences } from '../types';
import { dataStore } from './dataStore';

export const DEFAULT_SENSORY_PREFERENCES: Readonly<SensoryPreferences> = Object.freeze({
  animationSpeed: 'normal',
  soundEnabled: true,
  hapticEnabled: true,
  fontSize: 'medium',
  dyslexiaFont: false,
  colorMode: 'default',
});

let activePreferences: SensoryPreferences = { ...DEFAULT_SENSORY_PREFERENCES };
let lastConfirmedPreferences: SensoryPreferences = { ...DEFAULT_SENSORY_PREFERENCES };
let persistenceQueue: Promise<void> = Promise.resolve();
let latestPersistenceRequestId = 0;

const isAnimationSpeed = (value: unknown): value is SensoryPreferences['animationSpeed'] =>
  value === 'normal' || value === 'reduced' || value === 'none';
const isFontSize = (value: unknown): value is SensoryPreferences['fontSize'] =>
  value === 'small' || value === 'medium' || value === 'large';
const isColorMode = (value: unknown): value is SensoryPreferences['colorMode'] =>
  value === 'default' || value === 'high-contrast' || value === 'warm' || value === 'cool';

/** Returns the sole complete preference shape; invalid or partial stored data is never applied. */
export function normalizeSensoryPreferences(value: unknown): SensoryPreferences {
  if (!isValidSensoryPreferences(value)) {
    return { ...DEFAULT_SENSORY_PREFERENCES };
  }
  return value;
}

/** Strict validation for user-initiated saves/imports. Invalid data must never become defaults. */
export function isValidSensoryPreferences(value: unknown): value is SensoryPreferences {
  if (
    !value ||
    typeof value !== 'object' ||
    !isAnimationSpeed((value as Record<string, unknown>).animationSpeed) ||
    typeof (value as Record<string, unknown>).soundEnabled !== 'boolean' ||
    typeof (value as Record<string, unknown>).hapticEnabled !== 'boolean' ||
    !isFontSize((value as Record<string, unknown>).fontSize) ||
    typeof (value as Record<string, unknown>).dyslexiaFont !== 'boolean' ||
    !isColorMode((value as Record<string, unknown>).colorMode)
  ) {
    return false;
  }
  return true;
}

export function requireValidSensoryPreferences(value: unknown): SensoryPreferences {
  if (!isValidSensoryPreferences(value)) {
    throw new Error('Sensory preferences must include a complete valid preference shape.');
  }
  return value;
}

export function applySensoryPreferences(prefs: SensoryPreferences): void {
  activePreferences = normalizeSensoryPreferences(prefs);
  const root = document.documentElement;
  root.setAttribute('data-animation-speed', activePreferences.animationSpeed);
  root.setAttribute('data-font-size', activePreferences.fontSize);
  root.setAttribute('data-color-mode', activePreferences.colorMode);
  document.body.classList.toggle('dyslexia-font', activePreferences.dyslexiaFont);
}

/** Seeds the live and durable state after startup storage initialization. */
export function initializeSensoryPreferences(prefs: unknown): SensoryPreferences {
  const normalized = normalizeSensoryPreferences(prefs);
  lastConfirmedPreferences = normalized;
  applySensoryPreferences(normalized);
  return normalized;
}

/** Central gate used by every haptic caller. */
export function isHapticFeedbackEnabled(): boolean {
  return activePreferences.hapticEnabled;
}

/** Central gate used by every audible feedback caller. */
export function isSoundFeedbackEnabled(): boolean {
  return activePreferences.soundEnabled;
}

export async function loadSensoryPreferences(): Promise<SensoryPreferences> {
  try {
    return normalizeSensoryPreferences(await dataStore.getSensoryPreferences());
  } catch {
    return { ...DEFAULT_SENSORY_PREFERENCES };
  }
}

export class SensoryPreferencesPersistenceError extends Error {
  constructor() {
    super('Sensory preferences could not be verified after saving.');
    this.name = 'SensoryPreferencesPersistenceError';
  }
}

export type SensoryPersistenceResult =
  | { status: 'confirmed'; prefs: SensoryPreferences }
  | { status: 'stale-failed' }
  | { status: 'failed'; prefs: SensoryPreferences; error: unknown };

/**
 * Persists only validated preferences and verifies durable storage with a read-back.
 * A storage implementation that drops a write must not be reported as a success.
 */
export async function saveSensoryPreferences(value: unknown): Promise<SensoryPreferences> {
  const prefs = requireValidSensoryPreferences(value);
  await dataStore.saveSensoryPreferences(prefs);
  const saved = normalizeSensoryPreferences(await dataStore.getSensoryPreferences());
  if (JSON.stringify(saved) !== JSON.stringify(prefs)) {
    throw new SensoryPreferencesPersistenceError();
  }
  return saved;
}

/**
 * Serializes preference writes. Older failures cannot undo a newer selection; a failure of the
 * latest desired value restores the last state that was actually verified from storage.
 */
export async function persistSensoryPreferences(value: unknown): Promise<SensoryPersistenceResult> {
  const requested = requireValidSensoryPreferences(value);
  const requestId = ++latestPersistenceRequestId;

  const operation = persistenceQueue.then(async (): Promise<SensoryPersistenceResult> => {
    try {
      const confirmed = await saveSensoryPreferences(requested);
      lastConfirmedPreferences = confirmed;
      return { status: 'confirmed', prefs: confirmed };
    } catch (error) {
      if (requestId !== latestPersistenceRequestId) {
        return { status: 'stale-failed' };
      }
      applySensoryPreferences(lastConfirmedPreferences);
      return { status: 'failed', prefs: lastConfirmedPreferences, error };
    }
  });

  persistenceQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}
