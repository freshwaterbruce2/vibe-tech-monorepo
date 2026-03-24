import type {
  FeatureFlag,
  EvaluationContext,
  EvaluationResult,
  FeatureFlagClientConfig,
  KillSwitchEvent,
  WSMessage,
  BulkFlagResponse,
  FlagEvaluationResponse,
  Logger,
  Variant,
} from '@dev/feature-flags-core';
import { isInPercentageRollout, assignVariant } from '@dev/feature-flags-core';
import WebSocket from 'ws';
import { FlagCache } from './cache';

const DEFAULT_REFRESH_INTERVAL = 30_000; // 30 seconds
const KILL_SWITCH_CHECK_INTERVAL = 1_000; // 1 second for critical flags

/**
 * Node.js Feature Flag Client
 * 
 * Works in backend services, Electron main process, and Tauri sidecar.
 */
export class FeatureFlagClient {
  private config: Required<FeatureFlagClientConfig>;
  private cache: FlagCache;
  private ws: WebSocket | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private killSwitchTimer: NodeJS.Timeout | null = null;
  private initialized = false;
  private logger: Logger;

  constructor(config: FeatureFlagClientConfig) {
    this.logger = config.logger ?? this.createDefaultLogger();
    
    this.config = {
      serverUrl: config.serverUrl,
      environment: config.environment,
      apiKey: config.apiKey ?? '',
      refreshIntervalMs: config.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL,
      enableWebSocket: config.enableWebSocket ?? true,
      enableLocalCache: config.enableLocalCache ?? true,
      cacheMaxAge: config.cacheMaxAge ?? 300_000, // 5 minutes
      onKillSwitch: config.onKillSwitch ?? (() => {}),
      onError: config.onError ?? ((err: Error) => this.logger.error('Feature flag error:', err)),
      logger: this.logger,
    };

    this.cache = new FlagCache(this.config.cacheMaxAge);
  }

  /**
   * Initialize the client - fetches flags and sets up real-time updates
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initial fetch
      await this.refreshFlags();

      // Set up polling
      this.startPolling();

      // Set up WebSocket for real-time updates
      if (this.config.enableWebSocket) {
        this.connectWebSocket();
      }

      // Fast polling for kill switches
      this.startKillSwitchPolling();

      this.initialized = true;
      this.logger.info('Feature flag client initialized');
    } catch (error) {
      this.config.onError(error as Error);
      throw error;
    }
  }

  /**
   * Check if a flag is enabled (synchronous - uses cache)
   */
  isEnabled(flagKey: string, context?: Partial<EvaluationContext>): boolean {
    const result = this.evaluate(flagKey, context);
    return result.enabled;
  }

  /**
   * Check if a kill switch is active (synchronous - uses cache)
   * Kill switches are always checked from local cache for speed
   */
  isKillSwitchActive(flagKey: string): boolean {
    const flag = this.cache.get(flagKey);
    if (flag?.type !== 'kill_switch') return false;
    return flag.enabled;
  }

  /**
   * Get variant assignment for A/B tests
   */
  getVariant(
    flagKey: string,
    context?: Partial<EvaluationContext>
  ): { variant: string | null; payload?: Record<string, unknown> } {
    const result = this.evaluate(flagKey, context);
    
    if (!result.enabled || !result.variant) {
      return { variant: null };
    }

    return {
      variant: result.variant,
      payload: result.payload,
    };
  }

  /**
   * Full evaluation with reason
   */
  evaluate(flagKey: string, partialContext?: Partial<EvaluationContext>): EvaluationResult {
    const context: EvaluationContext = {
      environment: this.config.environment,
      ...partialContext,
    };

    const flag = this.cache.get(flagKey);

    if (!flag) {
      return {
        flagKey,
        enabled: false,
        reason: 'error',
      };
    }

    // Kill switch - always check first
    if (flag.type === 'kill_switch') {
      return {
        flagKey,
        enabled: flag.enabled,
        reason: flag.enabled ? 'kill_switch_active' : 'default_value',
      };
    }

    // Check global enabled state
    if (!flag.enabled) {
      return {
        flagKey,
        enabled: false,
        reason: 'flag_disabled',
      };
    }

    // Get environment-specific value
    const envValue = flag.environments[context.environment];
    if (!envValue?.enabled) {
      return {
        flagKey,
        enabled: false,
        reason: 'flag_disabled',
      };
    }

    // Check targeting rules
    for (const rule of flag.rules) {
      if (!rule.enabled) continue;
      
      const matches = this.evaluateRule(rule, context);
      if (matches && rule.returnValue) {
        return {
          flagKey,
          enabled: rule.returnValue.enabled,
          reason: 'targeting_rule_match',
          ruleId: rule.id,
        };
      }
    }

    // Percentage rollout
    if ('percentage' in envValue) {
      const identifier = context.userId ?? context.sessionId ?? 'anonymous';
      const inRollout = isInPercentageRollout(identifier, flagKey, envValue.percentage);
      
      return {
        flagKey,
        enabled: inRollout,
        reason: 'percentage_rollout',
      };
    }

    // Variant assignment
    if (flag.variants && flag.variants.length > 0) {
      const identifier = context.userId ?? context.sessionId ?? 'anonymous';
      const variantKey = assignVariant(identifier, flagKey, flag.variants);
      const variant = flag.variants.find((v: Variant) => v.key === variantKey);

      return {
        flagKey,
        enabled: true,
        variant: variantKey,
        payload: variant?.payload,
        reason: 'variant_assignment',
      };
    }

    // Default to enabled
    return {
      flagKey,
      enabled: true,
      reason: 'default_value',
    };
  }

  /**
   * Force refresh flags from server
   */
  async refreshFlags(): Promise<void> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/flags`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.status}`);
      }

      const data: BulkFlagResponse = await response.json();
      
      for (const flag of data.flags) {
        this.cache.set(flag.key, flag);
      }

      this.logger.debug(`Refreshed ${data.flags.length} flags`);
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  /**
   * Evaluate multiple flags at once (server-side)
   */
  async evaluateFlags(
    flagKeys: string[],
    context: EvaluationContext
  ): Promise<Record<string, EvaluationResult>> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/evaluate`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flagKeys, context }),
      });

      if (!response.ok) {
        throw new Error(`Failed to evaluate flags: ${response.status}`);
      }

      const data: FlagEvaluationResponse = await response.json();
      return data.flags;
    } catch (error) {
      this.config.onError(error as Error);
      
      // Fallback to local evaluation
      const results: Record<string, EvaluationResult> = {};
      for (const key of flagKeys) {
        results[key] = this.evaluate(key, context);
      }
      return results;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    if (this.killSwitchTimer) {
      clearInterval(this.killSwitchTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
    this.initialized = false;
    this.logger.info('Feature flag client destroyed');
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private evaluateRule(
    rule: FeatureFlag['rules'][0],
    context: EvaluationContext
  ): boolean {
    const attrValue = this.getAttributeValue(rule.attribute, context);
    
    switch (rule.operator) {
      case 'equals':
        return attrValue === rule.value;
      case 'not_equals':
        return attrValue !== rule.value;
      case 'contains':
        return String(attrValue).includes(String(rule.value));
      case 'in_list':
        return Array.isArray(rule.value) && rule.value.includes(attrValue);
      case 'percentage': {
        const id = context.userId ?? context.sessionId ?? 'anonymous';
        return isInPercentageRollout(id, rule.id, Number(rule.value));
      }
      default:
        return false;
    }
  }

  private getAttributeValue(
    attribute: string,
    context: EvaluationContext
  ): unknown {
    // Check standard context properties
    if (attribute in context) {
      return (context as unknown as Record<string, unknown>)[attribute];
    }
    
    // Check custom attributes
    return context.attributes?.[attribute];
  }

  private startPolling(): void {
    this.refreshTimer = setInterval(() => {
      void this.refreshFlags();
    }, this.config.refreshIntervalMs);
  }

  private startKillSwitchPolling(): void {
    // More aggressive polling for kill switches
    this.killSwitchTimer = setInterval(() => {
      void this.pollKillSwitches();
    }, KILL_SWITCH_CHECK_INTERVAL);
  }

  private async pollKillSwitches(): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.serverUrl}/api/kill-switch/active`,
        { headers: this.getHeaders() }
      );
      
      if (response.ok) {
        const { flags } = await response.json();
        for (const flag of flags) {
          const cached = this.cache.get(flag.key);
          if (cached && !cached.enabled && flag.enabled) {
            // Kill switch was just activated
            this.handleKillSwitchEvent({
              flagKey: flag.key,
              action: 'activated',
              priority: flag.killSwitch?.priority ?? 'normal',
              timestamp: new Date().toISOString(),
            });
          }
          this.cache.set(flag.key, flag);
        }
      }
    } catch {
      // Silent fail for kill switch polling - WebSocket is primary
    }
  }

  private connectWebSocket(): void {
    const wsUrl = this.config.serverUrl.replace(/^http/, 'ws') + '/ws/flags';
    
    this.ws = new WebSocket(wsUrl, {
      headers: this.getHeaders(),
    });

    this.ws.on('open', () => {
      this.logger.debug('WebSocket connected');
    });

    this.ws.on('message', (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        this.handleWSMessage(message);
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      this.logger.debug('WebSocket disconnected, reconnecting...');
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    });

    this.ws.on('error', (error) => {
      this.logger.error('WebSocket error:', error);
    });
  }

  private handleWSMessage(message: WSMessage): void {
    switch (message.type) {
      case 'flag_update': {
        const flagUpdate = message.payload as { flag: FeatureFlag };
        this.cache.set(flagUpdate.flag.key, flagUpdate.flag);
        this.logger.debug(`Flag updated: ${flagUpdate.flag.key}`);
        break;
      }

      case 'kill_switch': {
        const ksPayload = message.payload as { event: KillSwitchEvent };
        this.handleKillSwitchEvent(ksPayload.event);
        break;
      }

      case 'ping':
        // Respond with pong
        this.ws?.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
    }
  }

  private handleKillSwitchEvent(event: KillSwitchEvent): void {
    this.logger.warn(`Kill switch ${event.action}: ${event.flagKey} (${event.priority})`);
    
    // Update cache immediately
    const flag = this.cache.get(event.flagKey);
    if (flag) {
      flag.enabled = event.action === 'activated';
      this.cache.set(event.flagKey, flag);
    }

    // Call user handler
    void this.config.onKillSwitch(event);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Environment': this.config.environment,
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }

  private createDefaultLogger(): Logger {
    return {
      debug: (msg: string, ...args: unknown[]) => console.debug(`[FF] ${msg}`, ...args),
      info: (msg: string, ...args: unknown[]) => console.info(`[FF] ${msg}`, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(`[FF] ${msg}`, ...args),
      error: (msg: string, ...args: unknown[]) => console.error(`[FF] ${msg}`, ...args),
    };
  }
}
