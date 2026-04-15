import { FeatureFlagClient } from '@vibetech/feature-flags-sdk-node';
import { logger } from './Logger';

/**
 * Feature Flag Service for Vibe Code Studio
 * Manages feature toggles and kill switches for the editor
 */
class FeatureFlagService {
  private client: InstanceType<typeof FeatureFlagClient> | null = null;
  private isInitialized = false;

  /**
   * Initialize the feature flag client
   * Should be called on application startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Feature flags already initialized');
      return;
    }

    this.client = new FeatureFlagClient({
      serverUrl: 'http://localhost:3100',
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
      enableWebSocket: true, // Real-time updates
      onKillSwitch: (event: { flagKey: string }) => {
        logger.warn('Kill switch triggered:', event.flagKey);
        // Handle kill switches (e.g., disable AI features)
      },
    });

    await this.client.initialize();
    this.isInitialized = true;
    logger.info('Feature flags initialized for Vibe Code Studio');
  }

  /**
   * Check if AI autocomplete is enabled
   */
  isAIAutocompleteEnabled(): boolean {
    if (!this.client) return false;
    return this.client.isEnabled('vibe-studio.ai_autocomplete');
  }

  /**
   * Generic flag check
   */
  isEnabled(flagKey: string): boolean {
    if (!this.client) return false;
    return this.client.isEnabled(flagKey);
  }

  /**
   * Get all active flags
   */
  getActiveFlags(): Record<string, boolean> {
    if (!this.client) return {};
    // Implementation depends on SDK API
    return {};
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();

// Export for convenience
export const initializeFeatureFlags = () => featureFlagService.initialize();
export const isAIAutocompleteEnabled = () => featureFlagService.isAIAutocompleteEnabled();
