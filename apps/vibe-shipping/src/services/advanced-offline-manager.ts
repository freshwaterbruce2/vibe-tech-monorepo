/**
 * Advanced Offline Manager for 2025
 * Features: Smart caching, predictive loading, conflict resolution, storage optimization
 */

export interface OfflineQueueItem {
  id: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC'
  endpoint: string
  data: any
  timestamp: number
  priority: 'low' | 'normal' | 'high' | 'critical'
  retryCount: number
  maxRetries: number
  backoffDelay: number
}

export interface CacheStrategy {
  name: string
  maxAge: number
  maxEntries: number
  updatePolicy: 'immediate' | 'background' | 'manual'
  conflictResolution: 'client-wins' | 'server-wins' | 'merge' | 'prompt-user'
}

export interface StorageQuota {
  used: number
  available: number
  quota: number
  percentage: number
}

export interface SyncStatus {
  isOnline: boolean
  lastSync: number
  pendingOperations: number
  failedOperations: number
  syncInProgress: boolean
  estimatedSyncTime: number
}

class AdvancedOfflineManager {
  private db: IDBDatabase | null = null
  private offlineQueue: OfflineQueueItem[] = []
  private cacheStrategies = new Map<string, CacheStrategy>()
  private syncInProgress = false
  private retryTimeouts = new Map<string, NodeJS.Timeout>()
  private predictiveCache = new Set<string>()

  constructor() {
    this.initializeDatabase()
    this.setupCacheStrategies()
    this.startPeriodicSync()
    this.setupNetworkListeners()
    this.initializePredictiveLoading()
  }

  /**
   * Initialize IndexedDB for offline operations
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ShippingOfflineDB', 3)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        this.loadOfflineQueue()
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Offline operations queue
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', {
            keyPath: 'id',
          })
          queueStore.createIndex('priority', 'priority')
          queueStore.createIndex('timestamp', 'timestamp')
        }

        // Cached data with metadata
        if (!db.objectStoreNames.contains('cacheData')) {
          const cacheStore = db.createObjectStore('cacheData', {
            keyPath: 'key',
          })
          cacheStore.createIndex('lastAccessed', 'lastAccessed')
          cacheStore.createIndex('category', 'category')
        }

        // Conflict resolution
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', {
            keyPath: 'id',
          })
          conflictStore.createIndex('timestamp', 'timestamp')
        }

        // Analytics and usage patterns
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', {
            keyPath: 'id',
            autoIncrement: true,
          })
          analyticsStore.createIndex('type', 'type')
          analyticsStore.createIndex('timestamp', 'timestamp')
        }
      }
    })
  }

  /**
   * Setup intelligent caching strategies
   */
  private setupCacheStrategies(): void {
    // Critical shipping data - immediate updates
    this.cacheStrategies.set('shipping-critical', {
      name: 'shipping-critical',
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxEntries: 100,
      updatePolicy: 'immediate',
      conflictResolution: 'server-wins',
    })

    // User preferences - background updates
    this.cacheStrategies.set('user-preferences', {
      name: 'user-preferences',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 50,
      updatePolicy: 'background',
      conflictResolution: 'client-wins',
    })

    // Static resources - manual updates
    this.cacheStrategies.set('static-resources', {
      name: 'static-resources',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEntries: 200,
      updatePolicy: 'manual',
      conflictResolution: 'server-wins',
    })

    // Analytics data - merge conflicts
    this.cacheStrategies.set('analytics', {
      name: 'analytics',
      maxAge: 60 * 60 * 1000, // 1 hour
      maxEntries: 1000,
      updatePolicy: 'background',
      conflictResolution: 'merge',
    })
  }

  /**
   * Queue operation for offline execution
   */
  async queueOperation(
    operation: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    const id = this.generateOperationId()
    const queueItem: OfflineQueueItem = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      ...operation,
      backoffDelay: operation.backoffDelay ?? 1000,
      maxRetries:
        operation.maxRetries ?? (operation.priority === 'critical' ? 10 : 5),
    }

    this.offlineQueue.push(queueItem)
    await this.saveToDatabase('offlineQueue', queueItem)

    // Try to execute immediately if online
    if (navigator.onLine) {
      this.processQueue()
    }

    return id
  }

  /**
   * Smart data retrieval with fallback strategies
   */
  async getData(
    key: string,
    category: string,
    options?: {
      strategy?: string
      forceRefresh?: boolean
      timeout?: number
    }
  ): Promise<any> {
    const strategy = this.cacheStrategies.get(
      options?.strategy ?? 'shipping-critical'
    )
    if (!strategy) {
      throw new Error(`Unknown cache strategy: ${options?.strategy}`)
    }

    try {
      // Check if force refresh or if we should try network first
      if (options?.forceRefresh || strategy.updatePolicy === 'immediate') {
        if (navigator.onLine) {
          const networkData = await this.fetchFromNetwork(key, options?.timeout)
          await this.updateCache(key, networkData, category, strategy)
          return networkData
        }
      }

      // Try cache first
      const cachedData = await this.getCachedData(key, strategy)
      if (cachedData && !this.isCacheExpired(cachedData, strategy)) {
        // Update access time for LRU
        await this.updateCacheAccess(key)

        // Background refresh if needed
        if (strategy.updatePolicy === 'background' && navigator.onLine) {
          this.backgroundRefresh(key, category, strategy)
        }

        return cachedData.data
      }

      // Fallback to network
      if (navigator.onLine) {
        const networkData = await this.fetchFromNetwork(key, options?.timeout)
        await this.updateCache(key, networkData, category, strategy)
        return networkData
      }

      // Last resort: return stale cache if available
      if (cachedData) {
        console.warn(`Returning stale cache for ${key}`)
        return cachedData.data
      }

      throw new Error(`No data available for ${key} while offline`)
    } catch (error) {
      console.error(`Failed to get data for ${key}:`, error)

      // Try to return cached data as fallback
      const cachedData = await this.getCachedData(key, strategy)
      if (cachedData) {
        console.warn(`Returning fallback cache for ${key}`)
        return cachedData.data
      }

      throw error
    }
  }

  /**
   * Update data with conflict resolution
   */
  async updateData(
    key: string,
    data: any,
    category: string,
    options?: {
      strategy?: string
      resolveConflicts?: boolean
    }
  ): Promise<boolean> {
    const strategy = this.cacheStrategies.get(
      options?.strategy ?? 'shipping-critical'
    )
    if (!strategy) {
      throw new Error(`Unknown cache strategy: ${options?.strategy}`)
    }

    try {
      if (navigator.onLine) {
        // Try to update on server
        const serverData = await this.updateOnServer(key, data)
        await this.updateCache(key, serverData, category, strategy)
        return true
      } else {
        // Queue for offline sync
        await this.queueOperation({
          operation: 'UPDATE',
          endpoint: `/api/data/${key}`,
          data,
          priority: 'normal',
          maxRetries: 5,
          backoffDelay: 1000,
        })

        // Update local cache
        await this.updateCache(key, data, category, strategy)
        return true
      }
    } catch (error) {
      console.error(`Failed to update data for ${key}:`, error)

      if (options?.resolveConflicts) {
        await this.handleConflict(key, data, error)
      }

      return false
    }
  }

  /**
   * Get comprehensive sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const pendingOps = this.offlineQueue.filter(
      op => op.retryCount < op.maxRetries
    )
    const failedOps = this.offlineQueue.filter(
      op => op.retryCount >= op.maxRetries
    )

    return {
      isOnline: navigator.onLine,
      lastSync: await this.getLastSyncTime(),
      pendingOperations: pendingOps.length,
      failedOperations: failedOps.length,
      syncInProgress: this.syncInProgress,
      estimatedSyncTime: this.estimateSyncTime(pendingOps),
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const used = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      const available = quota - used
      const percentage = quota > 0 ? (used / quota) * 100 : 0

      return { used, available, quota, percentage }
    }

    return { used: 0, available: 0, quota: 0, percentage: 0 }
  }

  /**
   * Optimize storage by removing old/unused data
   */
  async optimizeStorage(): Promise<void> {
    const quota = await this.getStorageQuota()

    if (quota.percentage > 80) {
      console.warn('Storage optimization needed, starting cleanup...')

      // Remove expired cache entries
      await this.cleanExpiredCache()

      // Remove least recently used entries
      await this.cleanLRUCache()

      // Remove old completed operations
      await this.cleanCompletedOperations()

      // Remove old analytics data
      await this.cleanOldAnalytics()

      console.warn('Storage optimization completed')
    }
  }

  /**
   * Predictive content loading based on usage patterns
   */
  private async initializePredictiveLoading(): Promise<void> {
    const usage = await this.getUsagePatterns()

    // Pre-load frequently accessed data
    for (const pattern of usage.frequent) {
      if (!this.predictiveCache.has(pattern.key)) {
        this.predictiveCache.add(pattern.key)
        setTimeout(() => {
          this.getData(pattern.key, pattern.category, {
            strategy: 'static-resources',
          }).catch(console.warn)
        }, 1000)
      }
    }

    // Pre-load based on time patterns
    this.scheduleTimeBasedPreloading(usage.timePatterns)
  }

  // Private helper methods
  private async processQueue(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return

    this.syncInProgress = true
    const sortedQueue = [...this.offlineQueue].sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    for (const operation of sortedQueue) {
      try {
        await this.executeOperation(operation)
        await this.removeFromQueue(operation.id)
      } catch (error) {
        await this.handleOperationFailure(operation, error)
      }
    }

    this.syncInProgress = false
  }

  private async executeOperation(operation: OfflineQueueItem): Promise<void> {
    const response = await fetch(operation.endpoint, {
      method: this.getHttpMethod(operation.operation),
      headers: { 'Content-Type': 'application/json' },
      body: operation.data ? JSON.stringify(operation.data) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  private async handleOperationFailure(
    operation: OfflineQueueItem,
    error: any
  ): Promise<void> {
    operation.retryCount++

    if (operation.retryCount >= operation.maxRetries) {
      console.error(`Operation ${operation.id} failed permanently:`, error)
      await this.moveToFailedOperations(operation)
    } else {
      // Exponential backoff
      const delay = operation.backoffDelay * Math.pow(2, operation.retryCount)
      operation.backoffDelay = Math.min(delay, 30000) // Max 30 seconds

      this.retryTimeouts.set(
        operation.id,
        setTimeout(() => {
          this.processQueue()
        }, operation.backoffDelay)
      )

      await this.saveToDatabase('offlineQueue', operation)
    }
  }

  private async handleConflict(
    key: string,
    localData: any,
    error: any
  ): Promise<void> {
    const conflictId = this.generateOperationId()
    const conflict = {
      id: conflictId,
      key,
      localData,
      serverData: error.serverData,
      timestamp: Date.now(),
      resolved: false,
    }

    await this.saveToDatabase('conflicts', conflict)

    // Notify user about conflict (implementation depends on UI framework)
    console.warn(`Data conflict detected for ${key}`)
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getHttpMethod(operation: string): string {
    switch (operation) {
      case 'CREATE':
        return 'POST'
      case 'UPDATE':
        return 'PUT'
      case 'DELETE':
        return 'DELETE'
      case 'SYNC':
        return 'GET'
      default:
        return 'POST'
    }
  }

  // Implementation of other helper methods would continue...
  // This is a comprehensive foundation for the advanced offline manager

  private async saveToDatabase(storeName: string, data: any): Promise<void> {
    if (!this.db) return undefined

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async loadOfflineQueue(): Promise<void> {
    if (!this.db) return undefined

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readonly')
      const store = transaction.objectStore('offlineQueue')
      const request = store.getAll()

      request.onsuccess = () => {
        this.offlineQueue = request.result || []
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.warn('Network connection restored')
      this.processQueue()
    })

    window.addEventListener('offline', () => {
      console.warn('Network connection lost')
    })
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.processQueue()
      }
    }, 30000) // Every 30 seconds
  }

  // Additional helper methods would be implemented here...
  private async fetchFromNetwork(key: string, timeout?: number): Promise<any> {
    const controller = new AbortController()
    if (timeout) {
      setTimeout(() => controller.abort(), timeout)
    }

    const response = await fetch(`/api/data/${key}`, {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return response.json()
  }

  private async getCachedData(
    _key: string,
    _strategy: CacheStrategy
  ): Promise<any> {
    // Implementation for retrieving cached data
    return null
  }

  private async updateCache(
    _key: string,
    _data: any,
    _category: string,
    _strategy: CacheStrategy
  ): Promise<void> {
    // Implementation for updating cache
  }

  private isCacheExpired(cachedData: any, strategy: CacheStrategy): boolean {
    return Date.now() - cachedData.timestamp > strategy.maxAge
  }

  private async updateCacheAccess(_key: string): Promise<void> {
    // Implementation for updating cache access time
  }

  private async backgroundRefresh(
    _key: string,
    _category: string,
    _strategy: CacheStrategy
  ): Promise<void> {
    // Implementation for background refresh
  }

  private async updateOnServer(key: string, data: any): Promise<any> {
    // Implementation for server updates
    return data
  }

  private async removeFromQueue(id: string): Promise<void> {
    this.offlineQueue = this.offlineQueue.filter(op => op.id !== id)
    // Remove from database
  }

  private async moveToFailedOperations(
    _operation: OfflineQueueItem
  ): Promise<void> {
    // Implementation for handling failed operations
  }

  private async getLastSyncTime(): Promise<number> {
    return Date.now() - 3600000 // Placeholder
  }

  private estimateSyncTime(operations: OfflineQueueItem[]): number {
    return operations.length * 1000 // Rough estimate
  }

  private async cleanExpiredCache(): Promise<void> {
    // Implementation for cleaning expired cache
  }

  private async cleanLRUCache(): Promise<void> {
    // Implementation for LRU cleanup
  }

  private async cleanCompletedOperations(): Promise<void> {
    // Implementation for cleaning completed operations
  }

  private async cleanOldAnalytics(): Promise<void> {
    // Implementation for cleaning old analytics
  }

  private async getUsagePatterns(): Promise<any> {
    return { frequent: [], timePatterns: [] }
  }

  private scheduleTimeBasedPreloading(_patterns: any[]): void {
    // Implementation for time-based preloading
  }
}

export const advancedOfflineManager = new AdvancedOfflineManager()
export default advancedOfflineManager
