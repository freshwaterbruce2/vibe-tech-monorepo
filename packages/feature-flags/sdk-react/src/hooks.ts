import type { EvaluationResult } from '@vibetech/feature-flags-core';
import { useContext } from 'react';
import { FeatureFlagContext, type FeatureFlagContextValue } from './context';

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

export function useFlag(flagKey: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagKey);
}

export function useVariant(flagKey: string): {
  variant: string | null;
  payload?: Record<string, unknown>;
} {
  const { getVariant } = useFeatureFlags();
  return getVariant(flagKey);
}

export function useFlagEvaluation(flagKey: string): EvaluationResult {
  const { evaluate } = useFeatureFlags();
  return evaluate(flagKey);
}

export const useFeatureFlag = useFlag;
