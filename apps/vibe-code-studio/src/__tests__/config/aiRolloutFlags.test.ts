import { afterEach, describe, expect, it } from 'vitest';

import {
  AI_ROLLOUT_FLAG_KEYS,
  isCancellationLifecycleEnabled,
  isCodeCorrectionRouteEnabled,
} from '../../config/aiRolloutFlags';

type EnvMap = Record<string, string | undefined>;
const env = import.meta.env as unknown as EnvMap;

const originalCancellationFlag = env[AI_ROLLOUT_FLAG_KEYS.cancellationLifecycle];
const originalCorrectionFlag = env[AI_ROLLOUT_FLAG_KEYS.codeCorrectionRoute];

function setEnvFlag(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete env[key];
    return;
  }
  env[key] = value;
}

describe('aiRolloutFlags', () => {
  afterEach(() => {
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.cancellationLifecycle, originalCancellationFlag);
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.codeCorrectionRoute, originalCorrectionFlag);
  });

  it('defaults both rollout flags to disabled when env vars are missing', () => {
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.cancellationLifecycle, undefined);
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.codeCorrectionRoute, undefined);

    expect(isCancellationLifecycleEnabled()).toBe(false);
    expect(isCodeCorrectionRouteEnabled()).toBe(false);
  });

  it('treats common true-like values as enabled', () => {
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.cancellationLifecycle, 'true');
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.codeCorrectionRoute, '1');

    expect(isCancellationLifecycleEnabled()).toBe(true);
    expect(isCodeCorrectionRouteEnabled()).toBe(true);
  });

  it('treats common false-like values as disabled', () => {
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.cancellationLifecycle, 'off');
    setEnvFlag(AI_ROLLOUT_FLAG_KEYS.codeCorrectionRoute, 'false');

    expect(isCancellationLifecycleEnabled()).toBe(false);
    expect(isCodeCorrectionRouteEnabled()).toBe(false);
  });
});
