import { appStore } from '../utils/electronStore';

/**
 * Feature Flags Service
 * Centralized feature flag management with localStorage persistence
 * Allows gradual rollout and easy rollback of new features
 */

export interface FeatureFlags {
  tutorPersonalization: boolean;
  buddyRolePlay: boolean;
  adaptiveAudio: boolean;
  enhancedAccessibility: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  tutorPersonalization: true,
  buddyRolePlay: true,
  adaptiveAudio: true,
  enhancedAccessibility: true,
};

const STORAGE_KEY = 'vibe-feature-flags';

class FeatureFlagService {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    try {
      const saved = appStore.get<FeatureFlags>(STORAGE_KEY);
      if (saved) {
        // Merge with defaults to handle new flags
        return { ...DEFAULT_FLAGS, ...saved };
      }
    } catch (error) {
      console.warn('Failed to load feature flags:', error);
    }
    return { ...DEFAULT_FLAGS };
  }

  private saveFlags(): void {
    try {
      appStore.set(STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.error('Failed to save feature flags:', error);
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] ?? false;
  }

  /**
   * Enable a feature
   */
  enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
    this.saveFlags();
  }

  /**
   * Disable a feature
   */
  disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
    this.saveFlags();
  }

  /**
   * Toggle a feature
   */
  toggle(feature: keyof FeatureFlags): boolean {
    this.flags[feature] = !this.flags[feature];
    this.saveFlags();
    return this.flags[feature];
  }

  /**
   * Get all flags
   */
  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Reset all flags to defaults
   */
  reset(): void {
    this.flags = { ...DEFAULT_FLAGS };
    this.saveFlags();
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();
