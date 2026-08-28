const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const DISABLED_VALUES = new Set(['0', 'false', 'no', 'off', 'disabled']);

const CANCEL_LIFECYCLE_FLAG = 'VITE_ENABLE_CANCEL_LIFECYCLE';
const CODE_CORRECTION_ROUTE_FLAG = 'VITE_ENABLE_CODE_CORRECTION_ROUTE';

function readBooleanFlag(flagName: string, defaultValue: boolean): boolean {
  const raw = import.meta.env[flagName];
  if (typeof raw !== 'string') {
    return defaultValue;
  }

  const normalized = raw.trim().toLowerCase();
  if (ENABLED_VALUES.has(normalized)) {
    return true;
  }
  if (DISABLED_VALUES.has(normalized)) {
    return false;
  }

  return defaultValue;
}

export function isCancellationLifecycleEnabled(): boolean {
  // Safe rollout default keeps the new lifecycle behind an explicit opt-in.
  return readBooleanFlag(CANCEL_LIFECYCLE_FLAG, false);
}

export function isCodeCorrectionRouteEnabled(): boolean {
  // Safe rollout default keeps correction routing opt-in until validated.
  return readBooleanFlag(CODE_CORRECTION_ROUTE_FLAG, false);
}

export const AI_ROLLOUT_FLAG_KEYS = {
  cancellationLifecycle: CANCEL_LIFECYCLE_FLAG,
  codeCorrectionRoute: CODE_CORRECTION_ROUTE_FLAG,
} as const;
