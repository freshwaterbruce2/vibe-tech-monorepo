/**
 * AI Response Cache Service
 * Intelligent caching layer for AI responses to reduce costs by 30-50%
 *
 * Features:
 * - LRU (Least Recently Used) eviction
 * - TTL (Time To Live) support
 * - Persistent storage (localStorage)
 * - Cache metrics (hit rate, cost savings)
 * - Fingerprint-based cache keys
 * - Automatic cleanup
 */

import type { AICompletionRequest, AICompletionResponse } from '../../types/ai';
import { logger } from '../Logger';

// Cache entry structure
interface CacheEntry {
  key: string;
  request: AICompletionRequest;
  response: AICompletionResponse;
  timestamp: number;
  hitCount: number;
  provider: string;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;        // Maximum number of cached entries
  ttlMs: number;          // Time to live in milliseconds
  persistToStorage: boolean;  // Save to localStorage
  storageKey: string;     // localStorage key
}

// Cache metrics
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  costSavings: number;  // Estimated cost savings (in API calls)
  cacheSize: number;
}

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100,                    // Store up to 100 responses
  ttlMs: 1000 * 60 * 60,          // 1 hour TTL
  persistToStorage: true,
  storageKey: 'vibe_ai_cache_v1',
};

export class AIResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    costSavings: 0,
    cacheSize: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage().catch(err => logger.error('[AICache] Failed to load from storage', err));
    this.startCleanupTimer();
    logger.info('[AICache] Initialized with config:', this.config);
  }

  /**
   * Generate cache key from request
   * Uses: messages + model + temperature + maxTokens
   */
  private generateKey(request: AICompletionRequest): string {
    const fingerprint = {
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      model: request.model ?? 'default',
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 2000,
    };

    // Create a stable JSON string (sorted keys)
    const stableJson = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());

    // Simple hash function (for cache key)
    return this.hashString(stableJson);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached response if available and not expired
   */
  get(request: AICompletionRequest): AICompletionResponse | null {
    const key = this.generateKey(request);
    const entry = this.cache.get(key);

    this.metrics.totalRequests++;

    if (!entry) {
      this.metrics.misses++;
      this.updateMetrics();
      logger.debug('[AICache] MISS:', key);
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.config.ttlMs) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateMetrics();
      logger.debug('[AICache] EXPIRED:', key, `(${Math.round(age / 1000)}s old)`);
      return null;
    }

    // Cache hit - update hit count and move to end (LRU)
    entry.hitCount++;
    entry.timestamp = Date.now(); // Refresh timestamp on access
    this.cache.delete(key);
    this.cache.set(key, entry); // Move to end of Map (most recently used)

    this.metrics.hits++;
    this.metrics.costSavings++;
    this.updateMetrics();

    logger.info('[AICache] HIT:', key, `(hit ${entry.hitCount} times, saved 1 API call)`);
    return entry.response;
  }

  /**
   * Store response in cache
   */
  async set(request: AICompletionRequest, response: AICompletionResponse, provider: string): Promise<void> {
    const key = this.generateKey(request);

    // Evict oldest entry if cache is full (LRU)
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug('[AICache] EVICTED (LRU):', oldestKey);
      }
    }

    const entry: CacheEntry = {
      key,
      request,
      response,
      timestamp: Date.now(),
      hitCount: 0,
      provider,
    };

    this.cache.set(key, entry);
    this.metrics.cacheSize = this.cache.size;

    if (this.config.persistToStorage) {
      await this.saveToStorage();
    }

    logger.debug('[AICache] STORED:', key, `(size: ${this.cache.size}/${this.config.maxSize})`);
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.cacheSize = 0;
    if (this.config.persistToStorage && window.electron?.store) {
      await window.electron.store.delete(this.config.storageKey);
    }
    logger.info('[AICache] Cleared all entries');
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0
      ? this.metrics.hits / this.metrics.totalRequests
      : 0;
    this.metrics.cacheSize = this.cache.size;
  }

  /**
   * Save cache to localStorage
   */
  private async saveToStorage(): Promise<void> {
    if (!this.config.persistToStorage) return;

    try {
      const entries = Array.from(this.cache.entries());
      const serialized = JSON.stringify({
        entries,
        metrics: this.metrics,
        timestamp: Date.now(),
      });

      if (window.electron?.store) {
          await window.electron.store.set(this.config.storageKey, serialized);
      }
      logger.debug('[AICache] Saved to storage:', entries.length, 'entries');
    } catch (error) {
      logger.error('[AICache] Failed to save to storage:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private async loadFromStorage(): Promise<void> {
    if (!this.config.persistToStorage) return;

    try {
      let serialized: string | null = null;
      if (window.electron?.store) {
          serialized = await window.electron.store.get(this.config.storageKey);
      }

      if (!serialized) return;

      const data = JSON.parse(serialized);
      const { entries, metrics, timestamp } = data;

      // Don't load if cache is too old (> 24 hours)
      const age = Date.now() - timestamp;
      if (age > 1000 * 60 * 60 * 24) {
        logger.info('[AICache] Storage cache too old, skipping load');
        if (window.electron?.store) {
            await window.electron.store.delete(this.config.storageKey);
        }
        return;
      }

      // Restore cache entries
      this.cache = new Map(entries);

      // Restore metrics
      this.metrics = { ...this.metrics, ...metrics };

      logger.info('[AICache] Loaded from storage:', this.cache.size, 'entries');
    } catch (error) {
      logger.error('[AICache] Failed to load from storage:', error);
      if (window.electron?.store) {
          await window.electron.store.delete(this.config.storageKey).catch(() => {});
      }
    }
  }

  /**
   * Cleanup expired entries (runs periodically)
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > this.config.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.metrics.cacheSize = this.cache.size;
      logger.info('[AICache] Cleanup removed', removed, 'expired entries');
      if (this.config.persistToStorage) {
        this.saveToStorage();
      }
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every 5 minutes
    setInterval(() => this.cleanup(), 1000 * 60 * 5);
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      key: string;
      model: string;
      provider: string;
      age: number;
      hitCount: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      model: entry.request.model ?? 'default',
      provider: entry.provider,
      age: Math.round((now - entry.timestamp) / 1000),
      hitCount: entry.hitCount,
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries,
    };
  }
}

// Singleton instance
let cacheInstance: AIResponseCache | null = null;

/**
 * Get the global cache instance
 */
export function getAICache(): AIResponseCache {
  if (!cacheInstance) {
    cacheInstance = new AIResponseCache();
  }
  return cacheInstance;
}

/**
 * Reset the cache instance (for testing)
 */
export function resetAICache(): void {
  cacheInstance?.clear();
  cacheInstance = null;
}
