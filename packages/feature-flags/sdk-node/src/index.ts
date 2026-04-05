export { FeatureFlagClient } from './client';
export { FlagCache } from './cache';

// Re-export core types
export type {
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
  KillSwitchEvent,
  FeatureFlagClientConfig,
  Environment,
  Variant,
} from '@vibetech/feature-flags-core';
