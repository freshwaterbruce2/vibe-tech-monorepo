import type { FeatureFlag } from '@dev/feature-flags-core';

interface CacheEntry {
  flag: FeatureFlag;
  timestamp: number;
}

/**
 * In-memory cache for feature flags with TTL support
 */
export class FlagCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge: number;

  constructor(maxAge: number = 300_000) {
    this.maxAge = maxAge;
  }

  get(key: string): FeatureFlag | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired (but still return for kill switches)
    const isExpired = Date.now() - entry.timestamp > this.maxAge;
    
    if (isExpired && entry.flag.type !== 'kill_switch') {
      // For non-kill-switch flags, return null if expired
      // This will trigger a re-fetch
      return null;
    }
    
    return entry.flag;
  }

  set(key: string, flag: FeatureFlag): void {
    this.cache.set(key, {
      flag,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getAll(): FeatureFlag[] {
    return Array.from(this.cache.values()).map(entry => entry.flag);
  }

  getKillSwitches(): FeatureFlag[] {
    return this.getAll().filter(flag => flag.type === 'kill_switch');
  }

  size(): number {
    return this.cache.size;
  }
}
