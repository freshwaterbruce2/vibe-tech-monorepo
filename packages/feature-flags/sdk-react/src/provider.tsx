import type {
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  KillSwitchEvent,
  Variant,
} from '@dev/feature-flags-core';
import { assignVariant, isInPercentageRollout } from '@dev/feature-flags-core';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FeatureFlagContext, type FeatureFlagContextValue, type FeatureFlagProviderProps } from './context';

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

  const context = useMemo<Partial<EvaluationContext>>(
    () => ({
      environment,
      ...userContext,
    }),
    [environment, userContext]
  );

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
      const nextError = err instanceof Error ? err : new Error(String(err));
      setError(nextError);
      onError?.(nextError);
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, environment, apiKey, onError]);

  useEffect(() => {
    void fetchFlags();

    const interval = setInterval(() => {
      void fetchFlags();
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchFlags, refreshIntervalMs]);

  useEffect(() => {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws/flags';
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

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
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [serverUrl, onKillSwitch]);

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

      if (flag.type === 'kill_switch') {
        return {
          flagKey,
          enabled: flag.enabled,
          reason: flag.enabled ? 'kill_switch_active' : 'default_value',
        };
      }

      if (!flag.enabled) {
        return {
          flagKey,
          enabled: false,
          reason: 'flag_disabled',
        };
      }

      const envValue = flag.environments[environment];
      if (!envValue?.enabled) {
        return {
          flagKey,
          enabled: false,
          reason: 'flag_disabled',
        };
      }

      if ('percentage' in envValue && envValue.percentage !== undefined) {
        const identifier = context.userId ?? context.sessionId ?? 'anonymous';
        const inRollout = isInPercentageRollout(identifier, flagKey, envValue.percentage);
        return {
          flagKey,
          enabled: inRollout,
          reason: 'percentage_rollout',
        };
      }

      if (flag.variants && flag.variants.length > 0) {
        const identifier = context.userId ?? context.sessionId ?? 'anonymous';
        const variantKey = assignVariant(identifier, flagKey, flag.variants);
        const variant = flag.variants.find((entry: Variant) => entry.key === variantKey);
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

  const isEnabled = useCallback(
    (flagKey: string): boolean => evaluate(flagKey).enabled,
    [evaluate]
  );

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
