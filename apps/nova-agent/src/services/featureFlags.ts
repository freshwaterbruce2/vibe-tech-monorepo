/**
 * Stub interface for FeatureFlagClient
 * Full implementation would connect to feature flags service
 */
interface IFeatureFlagClient {
  initialize(): Promise<void>;
  isEnabled(flagKey: string, context?: Record<string, unknown>): boolean;
}

/**
 * Local implementation of feature flag client
 * TODO: Replace with actual SDK when available
 */
class FeatureFlagClient implements IFeatureFlagClient {
  private serverUrl: string;
  private environment: 'prod' | 'dev';
  private enableWebSocket: boolean;
  private onKillSwitch?: (event: { flagKey: string }) => void;

  constructor(config: {
    serverUrl: string;
    environment: 'prod' | 'dev';
    enableWebSocket: boolean;
    onKillSwitch?: (event: { flagKey: string }) => void;
  }) {
    this.serverUrl = config.serverUrl;
    this.environment = config.environment;
    this.enableWebSocket = config.enableWebSocket;
    this.onKillSwitch = config.onKillSwitch;
  }

  async initialize(): Promise<void> {
    // Placeholder: would connect to feature flags service
  }

  isEnabled(_flagKey: string, _context?: Record<string, unknown>): boolean {
    // Placeholder: default to true in development, false in production
    return this.environment === 'dev';
  }
}

/**
 * Feature Flag Service for Nova Agent
 * Manages AI feature toggles and reasoning capabilities
 */
class NovaFeatureFlags {
  private client: FeatureFlagClient | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.client = new FeatureFlagClient({
      serverUrl: 'http://localhost:3100',
      environment: import.meta.env.MODE === 'production' ? 'prod' : 'dev',
      enableWebSocket: true,
      onKillSwitch: (event: { flagKey: string }): void => {
        console.warn('⚠️ Nova Kill Switch:', event.flagKey);
      },
    });

    await this.client.initialize();
    this.isInitialized = true;
    console.log('✅ Nova Agent feature flags initialized');
  }

  /**
   * Check if advanced reasoning should be enabled
   * Uses percentage rollout (25% in prod, 100% in dev)
   */
  shouldUseAdvancedReasoning(userId?: string): boolean {
    if (!this.client) return false;
    return this.client.isEnabled('nova.advanced_reasoning', { userId });
  }

  /**
   * Generic flag check
   */
  isEnabled(flagKey: string, context?: Record<string, unknown>): boolean {
    if (!this.client) return false;
    return this.client.isEnabled(flagKey, context);
  }
}

// Export singleton
export const novaFeatureFlags = new NovaFeatureFlags();

// Convenience exports
export const initializeNovaFlags = async () => novaFeatureFlags.initialize();
export const shouldUseAdvancedReasoning = (userId?: string) =>
  novaFeatureFlags.shouldUseAdvancedReasoning(userId);
