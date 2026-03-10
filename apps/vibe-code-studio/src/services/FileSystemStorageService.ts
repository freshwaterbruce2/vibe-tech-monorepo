/**
 * FileSystem Storage Service - IndexedDB persistence layer
 * Provides persistent storage for file content, metadata, and search capabilities
 * Based on 2025 best practices for efficient browser storage
 */

import { logger } from '../services/Logger';
import { FileSystemItem } from '../types';

const DB_NAME = 'VibeCodeStudioFileSystem';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const METADATA_STORE = 'metadata';
const RECENT_FILES_STORE = 'recentFiles';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface FileMetadata {
  path: string;
  content: string;
  size: number;
  modified: Date;
  created: Date;
  type: 'file' | 'directory';
  mimeType?: string;
  tags?: string[];
  lastAccessed?: Date;
  cachedAt: Date;
}

export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  regex?: boolean;
  includeContent?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

export interface FilterOptions {
  fileTypes?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  sizeMin?: number;
  sizeMax?: number;
  tags?: string[];
}

/**
 * Persistent storage for FileSystemService using IndexedDB
 */
export class FileSystemStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private memoryCache: Map<string, FileMetadata> = new Map();

  constructor() {
    this.initPromise = this.initialize();
  }

  /**
   * Initialize IndexedDB
   */
  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open FileSystem IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.debug('FileSystem IndexedDB initialized');
        // Load frequently accessed files to memory cache
        this.loadRecentToCache();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create files store
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, {
            keyPath: 'path',
          });

          // Indexes for efficient queries
          filesStore.createIndex('modified', 'modified', { unique: false });
          filesStore.createIndex('size', 'size', { unique: false });
          filesStore.createIndex('type', 'type', { unique: false });
          filesStore.createIndex('mimeType', 'mimeType', { unique: false });
          filesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Create metadata store for directories
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, {
            keyPath: 'path',
          });
          metadataStore.createIndex('parent', 'parent', { unique: false });
        }

        // Create recent files store
        if (!db.objectStoreNames.contains(RECENT_FILES_STORE)) {
          const recentStore = db.createObjectStore(RECENT_FILES_STORE, {
            keyPath: 'path',
          });
          recentStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        logger.debug('FileSystem database schema created');
      };
    });
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Load recent files to memory cache for fast access
   */
  private async loadRecentToCache(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([RECENT_FILES_STORE], 'readonly');
    const store = transaction.objectStore(RECENT_FILES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const recentFiles = request.result.slice(0, 50); // Cache top 50 recent files
      for (const file of recentFiles) {
        this.memoryCache.set(file.path, file);
      }
      logger.debug(`Loaded ${recentFiles.length} recent files to cache`);
    };
  }

  /**
   * Save file with content and metadata
   */
  async saveFile(path: string, content: string, metadata?: Partial<FileMetadata>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const fileData: FileMetadata = {
      path,
      content,
      size: new Blob([content]).size,
      modified: metadata?.modified ?? new Date(),
      created: metadata?.created ?? new Date(),
      type: 'file',
      mimeType: metadata?.mimeType ?? this.getMimeType(path),
      tags: metadata?.tags,
      lastAccessed: new Date(),
      cachedAt: new Date(),
    };

    // Update memory cache
    this.memoryCache.set(path, fileData);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE, RECENT_FILES_STORE], 'readwrite');

      // Save to files store
      const filesStore = transaction.objectStore(FILES_STORE);
      filesStore.put(fileData);

      // Update recent files
      const recentStore = transaction.objectStore(RECENT_FILES_STORE);
      recentStore.put({
        path,
        lastAccessed: new Date(),
      });

      transaction.oncomplete = () => {
        logger.debug(`File saved to storage: ${path}`);
        resolve();
      };

      transaction.onerror = () => {
        logger.error('Failed to save file:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Load file from storage
   */
  async loadFile(path: string): Promise<FileMetadata | null> {
    await this.ensureInitialized();

    // Check memory cache first
    if (this.memoryCache.has(path)) {
      const cached = this.memoryCache.get(path)!;
      cached.lastAccessed = new Date();
      return cached;
    }

    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE, RECENT_FILES_STORE], 'readwrite');
      const filesStore = transaction.objectStore(FILES_STORE);
      const request = filesStore.get(path);

      request.onsuccess = () => {
        const file = request.result;
        if (file) {
          // Update last accessed time
          file.lastAccessed = new Date();

          // Update memory cache
          this.memoryCache.set(path, file);

          // Update recent files
          const recentStore = transaction.objectStore(RECENT_FILES_STORE);
          recentStore.put({
            path,
            lastAccessed: new Date(),
          });

          resolve(file);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        logger.error('Failed to load file:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete file from storage
   */
  async deleteFile(path: string): Promise<void> {
    await this.ensureInitialized();

    // Remove from memory cache
    this.memoryCache.delete(path);

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE, RECENT_FILES_STORE], 'readwrite');

      transaction.objectStore(FILES_STORE).delete(path);
      transaction.objectStore(RECENT_FILES_STORE).delete(path);

      transaction.oncomplete = () => {
        logger.debug(`File deleted from storage: ${path}`);
        resolve();
      };

      transaction.onerror = () => {
        logger.error('Failed to delete file:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Search files by content or filename
   */
  async searchFiles(options: SearchOptions): Promise<FileMetadata[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as FileMetadata[];

        // Filter by search query
        if (options.query) {
          const searchRegex = options.regex
            ? new RegExp(options.query, options.caseSensitive ? 'g' : 'gi')
            : null;

          results = results.filter(file => {
            // Search in filename
            const filenameMatch = searchRegex
              ? searchRegex.test(file.path)
              : options.caseSensitive
                ? file.path.includes(options.query)
                : file.path.toLowerCase().includes(options.query.toLowerCase());

            if (filenameMatch) return true;

            // Search in content if requested
            if (options.includeContent && file.content) {
              return searchRegex
                ? searchRegex.test(file.content)
                : options.caseSensitive
                  ? file.content.includes(options.query)
                  : file.content.toLowerCase().includes(options.query.toLowerCase());
            }

            return false;
          });
        }

        // Filter by file types
        if (options.fileTypes?.length) {
          results = results.filter(file => {
            const extension = file.path.split('.').pop()?.toLowerCase();
            return extension && options.fileTypes!.includes(extension);
          });
        }

        // Limit results
        if (options.maxResults) {
          results = results.slice(0, options.maxResults);
        }

        resolve(results);
      };

      request.onerror = () => {
        logger.error('Failed to search files:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Filter files by various criteria
   */
  async filterFiles(options: FilterOptions): Promise<FileMetadata[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as FileMetadata[];

        // Filter by file types
        if (options.fileTypes?.length) {
          results = results.filter(file => {
            const extension = file.path.split('.').pop()?.toLowerCase();
            return extension && options.fileTypes!.includes(extension);
          });
        }

        // Filter by modification date
        if (options.modifiedAfter) {
          results = results.filter(file =>
            new Date(file.modified) >= options.modifiedAfter!
          );
        }

        if (options.modifiedBefore) {
          results = results.filter(file =>
            new Date(file.modified) <= options.modifiedBefore!
          );
        }

        // Filter by size
        if (options.sizeMin !== undefined) {
          results = results.filter(file => file.size >= options.sizeMin!);
        }

        if (options.sizeMax !== undefined) {
          results = results.filter(file => file.size <= options.sizeMax!);
        }

        // Filter by tags
        if (options.tags?.length) {
          results = results.filter(file =>
            file.tags?.some(tag => options.tags!.includes(tag))
          );
        }

        resolve(results);
      };

      request.onerror = () => {
        logger.error('Failed to filter files:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all cached files
   */
  async getAllFiles(): Promise<FileMetadata[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        logger.error('Failed to get all files:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear old cached files
   */
  async clearOldCache(expiryMs: number = CACHE_EXPIRY_MS): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) return 0;

    const cutoffDate = new Date(Date.now() - expiryMs);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readwrite');
      const store = transaction.objectStore(FILES_STORE);
      const index = store.index('cachedAt');
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        logger.debug(`Cleared ${deletedCount} old cached files`);
        // Clear memory cache of old files
        for (const [path, file] of this.memoryCache.entries()) {
          if (new Date(file.cachedAt) < cutoffDate) {
            this.memoryCache.delete(path);
          }
        }
        resolve(deletedCount);
      };

      transaction.onerror = () => {
        logger.error('Failed to clear old cache:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Clear all storage
   */
  async clearAllStorage(): Promise<void> {
    await this.ensureInitialized();

    // Clear memory cache
    this.memoryCache.clear();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [FILES_STORE, METADATA_STORE, RECENT_FILES_STORE],
        'readwrite'
      );

      transaction.objectStore(FILES_STORE).clear();
      transaction.objectStore(METADATA_STORE).clear();
      transaction.objectStore(RECENT_FILES_STORE).clear();

      transaction.oncomplete = () => {
        logger.debug('All file storage cleared');
        resolve();
      };

      transaction.onerror = () => {
        logger.error('Failed to clear storage:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ fileCount: number; totalSize: number; cacheSize: number }> {
    await this.ensureInitialized();
    if (!this.db) return { fileCount: 0, totalSize: 0, cacheSize: 0 };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([FILES_STORE], 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result as FileMetadata[];
        const stats = {
          fileCount: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          cacheSize: this.memoryCache.size,
        };
        resolve(stats);
      };

      request.onerror = () => resolve({ fileCount: 0, totalSize: 0, cacheSize: 0 });
    });
  }

  /**
   * Helper to determine MIME type from file extension
   */
  private getMimeType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      js: 'text/javascript',
      jsx: 'text/jsx',
      ts: 'text/typescript',
      tsx: 'text/tsx',
      html: 'text/html',
      css: 'text/css',
      json: 'application/json',
      md: 'text/markdown',
      txt: 'text/plain',
      py: 'text/x-python',
      java: 'text/x-java',
      cpp: 'text/x-c++src',
      c: 'text/x-csrc',
      h: 'text/x-chdr',
      xml: 'text/xml',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      sh: 'text/x-sh',
      sql: 'text/x-sql',
    };
    return mimeTypes[extension ?? ''] ?? 'text/plain';
  }
}

// Export singleton instance
export const fileSystemStorage = new FileSystemStorageService();