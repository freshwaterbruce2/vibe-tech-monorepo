import type {
  Environment,
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  KillSwitchEvent,
} from '@dev/feature-flags-core';
import { createContext } from 'react';
import type { ReactNode } from 'react';

export interface FeatureFlagContextValue {
  flags: Map<string, FeatureFlag>;
  context: Partial<EvaluationContext>;
  isLoading: boolean;
  error: Error | null;
  isEnabled: (flagKey: string) => boolean;
  getVariant: (flagKey: string) => { variant: string | null; payload?: Record<string, unknown> };
  evaluate: (flagKey: string) => EvaluationResult;
  refresh: () => Promise<void>;
}

export interface FeatureFlagProviderProps {
  children: ReactNode;
  serverUrl: string;
  environment: Environment;
  context?: Partial<EvaluationContext>;
  apiKey?: string;
  refreshIntervalMs?: number;
  onKillSwitch?: (event: KillSwitchEvent) => void;
  onError?: (error: Error) => void;
}

export const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);
