/**
 * Working Memory Store
 * In-memory ring buffer with TTL for short-lived, high-frequency context.
 * Think of it as the agent's "scratch pad" — holds active context
 * that doesn't need persistence but must be instantly accessible.
 *
 * Use cases:
 *  - Current conversation context
 *  - Active file/task references
 *  - Intermediate reasoning steps
 *  - Tool call results being processed
 */

export interface WorkingMemoryItem {
  key: string;
  value: unknown;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

export interface WorkingMemoryConfig {
  /** Maximum items in the buffer (default: 100) */
  maxItems?: number;
  /** Default TTL in milliseconds (default: 30 minutes) */
  defaultTtlMs?: number;
  /** Eviction strategy when full (default: 'lru') */
  evictionStrategy?: 'lru' | 'ttl' | 'fifo';
}

const DEFAULT_MAX_ITEMS = 100;
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class WorkingMemory {
  private items: Map<string, WorkingMemoryItem> = new Map();
  private maxItems: number;
  private defaultTtlMs: number;
  private evictionStrategy: 'lru' | 'ttl' | 'fifo';
  private insertionOrder: string[] = [];

  constructor(config: WorkingMemoryConfig = {}) {
    this.maxItems = config.maxItems ?? DEFAULT_MAX_ITEMS;
    this.defaultTtlMs = config.defaultTtlMs ?? DEFAULT_TTL_MS;
    this.evictionStrategy = config.evictionStrategy ?? 'lru';
  }

  /**
   * Put an item into working memory
   */
  set(key: string, value: unknown, options?: { ttlMs?: number; tags?: string[] }): void {
    const now = Date.now();
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;

    // Remove existing to update insertion order
    if (this.items.has(key)) {
      this.insertionOrder = this.insertionOrder.filter((k) => k !== key);
    }

    // Evict if at capacity
    while (this.items.size >= this.maxItems) {
      this.evictOne();
    }

    this.items.set(key, {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
      accessCount: 0,
      lastAccessed: now,
      tags: options?.tags ?? [],
    });
    this.insertionOrder.push(key);
  }

  /**
   * Get an item from working memory (updates access stats)
   */
  get<T = unknown>(key: string): T | undefined {
    this.cleanExpired();
    const item = this.items.get(key);
    if (!item) return undefined;

    item.accessCount++;
    item.lastAccessed = Date.now();
    return item.value as T;
  }

  /**
   * Check if key exists (without updating access stats)
   */
  has(key: string): boolean {
    this.cleanExpired();
    return this.items.has(key);
  }

  /**
   * Delete an item
   */
  delete(key: string): boolean {
    this.insertionOrder = this.insertionOrder.filter((k) => k !== key);
    return this.items.delete(key);
  }

  /**
   * Get all items matching tags
   */
  getByTags(tags: string[]): WorkingMemoryItem[] {
    this.cleanExpired();
    const tagSet = new Set(tags);
    const results: WorkingMemoryItem[] = [];

    for (const item of this.items.values()) {
      if (item.tags.some((t) => tagSet.has(t))) {
        results.push(item);
      }
    }

    return results;
  }

  /**
   * Get all items as an array (sorted by lastAccessed DESC)
   */
  getAll(): WorkingMemoryItem[] {
    this.cleanExpired();
    return Array.from(this.items.values()).sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
    this.insertionOrder = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    size: number;
    maxItems: number;
    utilization: number;
    oldestMs: number;
    newestMs: number;
  } {
    this.cleanExpired();
    const now = Date.now();
    const values = Array.from(this.items.values());

    return {
      size: this.items.size,
      maxItems: this.maxItems,
      utilization: this.items.size / this.maxItems,
      oldestMs: values.length > 0 ? now - Math.min(...values.map((v) => v.createdAt)) : 0,
      newestMs: values.length > 0 ? now - Math.max(...values.map((v) => v.createdAt)) : 0,
    };
  }

  /**
   * Extend TTL for a key
   */
  touch(key: string, additionalTtlMs?: number): boolean {
    const item = this.items.get(key);
    if (!item) return false;

    const now = Date.now();
    item.lastAccessed = now;
    item.accessCount++;
    if (additionalTtlMs) {
      item.expiresAt = now + additionalTtlMs;
    }
    return true;
  }

  // ─── Private ────────────────────────────────────────────

  private cleanExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, item] of this.items) {
      if (now > item.expiresAt) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.items.delete(key);
      this.insertionOrder = this.insertionOrder.filter((k) => k !== key);
    }
  }

  private evictOne(): void {
    this.cleanExpired();
    if (this.items.size === 0) return;

    let evictKey: string | undefined;

    switch (this.evictionStrategy) {
      case 'lru': {
        let oldestAccess = Infinity;
        for (const [key, item] of this.items) {
          if (item.lastAccessed < oldestAccess) {
            oldestAccess = item.lastAccessed;
            evictKey = key;
          }
        }
        break;
      }
      case 'ttl': {
        let soonestExpiry = Infinity;
        for (const [key, item] of this.items) {
          if (item.expiresAt < soonestExpiry) {
            soonestExpiry = item.expiresAt;
            evictKey = key;
          }
        }
        break;
      }
      case 'fifo': {
        evictKey = this.insertionOrder[0];
        break;
      }
    }

    if (evictKey) {
      this.items.delete(evictKey);
      this.insertionOrder = this.insertionOrder.filter((k) => k !== evictKey);
    }
  }
}
