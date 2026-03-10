import type {
    Environment,
    EvaluationContext,
    EvaluationResult,
    FeatureFlag,
    KillSwitchEvent,
} from '@dev/feature-flags-core';
import { assignVariant, isInPercentageRollout } from '@dev/feature-flags-core';
import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FeatureFlagContextValue {
  flags: Map<string, FeatureFlag>;
  context: Partial<EvaluationContext>;
  isLoading: boolean;
  error: Error | null;
  isEnabled: (flagKey: string) => boolean;
  getVariant: (flagKey: string) => { variant: string | null; payload?: Record<string, unknown> };
  evaluate: (flagKey: string) => EvaluationResult;
  refresh: () => Promise<void>;
}

interface FeatureFlagProviderProps {
  children: ReactNode;
  serverUrl: string;
  environment: Environment;
  context?: Partial<EvaluationContext>;
  apiKey?: string;
  refreshIntervalMs?: number;
  onKillSwitch?: (event: KillSwitchEvent) => void;
  onError?: (error: Error) => void;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function FeatureFlagProvider({
  children,
  serverUrl,
  environment,
  context: userContext = {},
  apiKey,
  refreshIntervalMs = 30_000,
  onKillSwitch,
  onError,
}: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<Map<string, FeatureFlag>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize the evaluation context
  const context = useMemo<Partial<EvaluationContext>>(
    () => ({
      environment,
      ...userContext,
    }),
    [environment, userContext]
  );

  // Fetch flags from server
  const fetchFlags = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'X-Environment': environment,
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${serverUrl}/api/flags`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.status}`);
      }

      const data = await response.json();
      const newFlags = new Map<string, FeatureFlag>();

      for (const flag of data.flags) {
        newFlags.set(flag.key, flag);
      }

      setFlags(newFlags);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, environment, apiKey, onError]);

  // Initial fetch and polling
  useEffect(() => {
    fetchFlags();

    const interval = setInterval(fetchFlags, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchFlags, refreshIntervalMs]);

  // WebSocket for real-time updates
  useEffect(() => {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws/flags';
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'flag_update') {
            const flag = message.payload.flag as FeatureFlag;
            setFlags((prev) => {
              const next = new Map(prev);
              next.set(flag.key, flag);
              return next;
            });
          } else if (message.type === 'kill_switch') {
            const ksEvent = message.payload.event as KillSwitchEvent;
            onKillSwitch?.(ksEvent);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [serverUrl, onKillSwitch]);

  // Evaluation function
  const evaluate = useCallback(
    (flagKey: string): EvaluationResult => {
      const flag = flags.get(flagKey);

      if (!flag) {
        return {
          flagKey,
          enabled: false,
          reason: 'error',
        };
      }

      // Kill switch
      if (flag.type === 'kill_switch') {
        return {
          flagKey,
          enabled: flag.enabled,
          reason: flag.enabled ? 'kill_switch_active' : 'default_value',
        };
      }

      // Global disabled
      if (!flag.enabled) {
        return {
          flagKey,
          enabled: false,
          reason: 'flag_disabled',
        };
      }

      // Environment check
      const envValue = flag.environments[environment];
      if (!envValue?.enabled) {
        return {
          flagKey,
          enabled: false,
          reason: 'flag_disabled',
        };
      }

      // Percentage rollout
      if ('percentage' in envValue && envValue.percentage !== undefined) {
        const identifier = context.userId || context.sessionId || 'anonymous';
        const inRollout = isInPercentageRollout(identifier, flagKey, envValue.percentage);
        return {
          flagKey,
          enabled: inRollout,
          reason: 'percentage_rollout',
        };
      }

      // Variant assignment
      if (flag.variants && flag.variants.length > 0) {
        const identifier = context.userId || context.sessionId || 'anonymous';
        const variantKey = assignVariant(identifier, flagKey, flag.variants);
        const variant = flag.variants.find((v) => v.key === variantKey);
        return {
          flagKey,
          enabled: true,
          variant: variantKey,
          payload: variant?.payload,
          reason: 'variant_assignment',
        };
      }

      return {
        flagKey,
        enabled: true,
        reason: 'default_value',
      };
    },
    [flags, environment, context]
  );

  // Simple boolean check
  const isEnabled = useCallback(
    (flagKey: string): boolean => {
      return evaluate(flagKey).enabled;
    },
    [evaluate]
  );

  // Get variant
  const getVariant = useCallback(
    (flagKey: string): { variant: string | null; payload?: Record<string, unknown> } => {
      const result = evaluate(flagKey);
      if (!result.enabled || !result.variant) {
        return { variant: null };
      }
      return { variant: result.variant, payload: result.payload };
    },
    [evaluate]
  );

  const value: FeatureFlagContextValue = useMemo(
    () => ({
      flags,
      context,
      isLoading,
      error,
      isEnabled,
      getVariant,
      evaluate,
      refresh: fetchFlags,
    }),
    [flags, context, isLoading, error, isEnabled, getVariant, evaluate, fetchFlags]
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

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

// Alias for backward compatibility or preference
export const useFeatureFlag = useFlag;

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFlag(flag);
  return <>{enabled ? children : fallback}</>;
}

interface VariantGateProps {
  flag: string;
  variant: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function VariantGate({ flag, variant, children, fallback = null }: VariantGateProps) {
  const { variant: currentVariant } = useVariant(flag);
  return <>{currentVariant === variant ? children : fallback}</>;
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export type {
    FeatureFlagContextValue,
    FeatureFlagProviderProps,
    FeatureGateProps,
    VariantGateProps
};
