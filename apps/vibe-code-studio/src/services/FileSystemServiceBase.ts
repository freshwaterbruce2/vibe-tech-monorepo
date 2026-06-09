import { logger } from '../services/Logger';
import type { FileSystemItem } from '../types';

import { DEMO_FILES } from './FileSystemDemoData';

/** Tracks the modification status of a file in the workspace */
export type FileStatus = 'modified' | 'new' | 'deleted' | 'renamed' | 'untracked' | 'unchanged';

/** A file entry with its status metadata */
export interface TrackedFile {
  path: string;
  status: FileStatus;
  originalPath?: string; // For renamed files
  lastModified: number; // Epoch timestamp
}

/** Result of a content search match */
export interface ContentSearchResult {
  path: string;
  line: number;
  column: number;
  lineContent: string;
  matchLength: number;
}

export const STORAGE_KEY_FILES = 'vcs-fs-files';
export const STORAGE_KEY_RECENT = 'vcs-fs-recent';
export const STORAGE_KEY_TRACKED = 'vcs-fs-tracked';
export const MAX_RECENT_FILES = 20;

export abstract class FileSystemServiceBase {
  protected files: Map<string, string> = new Map();
  private recentFiles: string[] = [];
  protected trackedFiles: Map<string, TrackedFile> = new Map();

  // ---------------------------------------------------------------------------
  // Abstract methods implemented by the concrete subclass
  // ---------------------------------------------------------------------------

  abstract readFile(path: string): Promise<string>;
  abstract listDirectory(path: string): Promise<FileSystemItem[]>;
  abstract getFileStats(path: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
    isDirectory: boolean;
  }>;
  abstract isDirectory(path: string): Promise<boolean>;

  // ---------------------------------------------------------------------------
  // Persistence with localStorage
  // ---------------------------------------------------------------------------

  /** Save file tree, recent files, and tracked file metadata to localStorage */
  protected persistToStorage(): void {
    try {
      const filesData: Record<string, string> = {};
      for (const [key, value] of this.files) {
        filesData[key] = value;
      }
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(filesData));
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(this.recentFiles));

      const trackedData: Record<string, TrackedFile> = {};
      for (const [key, value] of this.trackedFiles) {
        trackedData[key] = value;
      }
      localStorage.setItem(STORAGE_KEY_TRACKED, JSON.stringify(trackedData));
    } catch (error) {
      logger.warn('[FileSystemService] Failed to persist state to localStorage:', error);
    }
  }

  /** Restore file tree, recent files, and tracked file metadata from localStorage */
  protected restoreFromStorage(): void {
    try {
      const filesJson = localStorage.getItem(STORAGE_KEY_FILES);
      if (filesJson) {
        const filesData = JSON.parse(filesJson) as Record<string, string>;
        for (const [key, value] of Object.entries(filesData)) {
          this.files.set(key, value);
        }
      }

      const recentJson = localStorage.getItem(STORAGE_KEY_RECENT);
      if (recentJson) {
        this.recentFiles = JSON.parse(recentJson) as string[];
      }

      const trackedJson = localStorage.getItem(STORAGE_KEY_TRACKED);
      if (trackedJson) {
        const trackedData = JSON.parse(trackedJson) as Record<string, TrackedFile>;
        for (const [key, value] of Object.entries(trackedData)) {
          this.trackedFiles.set(key, value);
        }
      }

      if (this.files.size > 0) {
        logger.debug(
          `[FileSystemService] Restored ${this.files.size} files, ${this.recentFiles.length} recent, ${this.trackedFiles.size} tracked from localStorage`,
        );
      }
    } catch (error) {
      logger.warn('[FileSystemService] Failed to restore state from localStorage:', error);
    }
  }

  /** Record a file access in the recent files list */
  protected recordRecentFile(path: string): void {
    this.recentFiles = [path, ...this.recentFiles.filter((p) => p !== path)].slice(
      0,
      MAX_RECENT_FILES,
    );
    this.persistToStorage();
  }

  /** Get the list of recently accessed files (most recent first) */
  getRecentFiles(): string[] {
    return [...this.recentFiles];
  }

  /** Clear all persisted state from localStorage */
  clearPersistedState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_FILES);
      localStorage.removeItem(STORAGE_KEY_RECENT);
      localStorage.removeItem(STORAGE_KEY_TRACKED);
      logger.debug('[FileSystemService] Cleared persisted state');
    } catch (error) {
      logger.warn('[FileSystemService] Failed to clear persisted state:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // In-memory path helpers
  // ---------------------------------------------------------------------------

  protected getDescendantPrefix(path: string): string {
    return path.endsWith('/') ? path : `${path}/`;
  }

  protected remapNestedPath(path: string, oldPath: string, newPath: string): string {
    if (path === oldPath) {
      return newPath;
    }

    const oldPrefix = this.getDescendantPrefix(oldPath);
    if (!path.startsWith(oldPrefix)) {
      return path;
    }

    return `${newPath}${path.slice(oldPath.length)}`;
  }

  protected getNestedFileEntries(path: string): Array<[string, string]> {
    const prefix = this.getDescendantPrefix(path);
    return Array.from(this.files.entries()).filter(([filePath]) => filePath.startsWith(prefix));
  }

  protected hasInMemoryPath(path: string): boolean {
    return this.files.has(path) || this.getNestedFileEntries(path).length > 0;
  }

  protected remapInMemoryReferences(oldPath: string, newPath: string): void {
    const remappedTrackedFiles = new Map<string, TrackedFile>();
    this.trackedFiles.forEach((tracked, trackedPath) => {
      const nextPath = this.remapNestedPath(trackedPath, oldPath, newPath);
      remappedTrackedFiles.set(nextPath, {
        ...tracked,
        path: nextPath,
        originalPath: tracked.originalPath
          ? this.remapNestedPath(tracked.originalPath, oldPath, newPath)
          : tracked.originalPath,
      });
    });
    this.trackedFiles = remappedTrackedFiles;

    this.recentFiles = this.recentFiles.map((recentPath) =>
      this.remapNestedPath(recentPath, oldPath, newPath),
    );
  }

  // ---------------------------------------------------------------------------
  // Status tracking
  // ---------------------------------------------------------------------------

  /** Track a file with a given status */
  trackFile(path: string, status: FileStatus, originalPath?: string): void {
    this.trackedFiles.set(path, {
      path,
      status,
      originalPath,
      lastModified: Date.now(),
    });
    this.persistToStorage();
  }

  /** Remove tracking for a file */
  untrackFile(path: string): void {
    this.trackedFiles.delete(path);
    this.persistToStorage();
  }

  /** Get the tracked status of a single file */
  getFileStatus(path: string): FileStatus {
    return this.trackedFiles.get(path)?.status ?? 'unchanged';
  }

  /** Filter tracked files by one or more statuses */
  filterByStatus(...statuses: FileStatus[]): TrackedFile[] {
    const statusSet = new Set(statuses);
    const results: TrackedFile[] = [];
    for (const tracked of this.trackedFiles.values()) {
      if (statusSet.has(tracked.status)) {
        results.push({ ...tracked });
      }
    }
    return results;
  }

  /** Get all tracked files regardless of status */
  getTrackedFiles(): TrackedFile[] {
    return Array.from(this.trackedFiles.values()).map((t) => ({ ...t }));
  }

  // ---------------------------------------------------------------------------
  // Demo file initialization
  // ---------------------------------------------------------------------------

  protected initializeDemoFiles(): void {
    for (const [path, content] of DEMO_FILES) {
      this.files.set(path, content);
    }
  }

  // ---------------------------------------------------------------------------
  // Search functionality
  // ---------------------------------------------------------------------------

  /**
   * Search for files by name (case-insensitive substring match).
   * Searches both in-memory files and, when in Electron mode, delegates
   * to the directory listing for the given root path.
   */
  async searchFilesByName(query: string, rootPath?: string): Promise<FileSystemItem[]> {
    const lowerQuery = query.toLowerCase();
    const results: FileSystemItem[] = [];

    // Search in-memory files first (demo / web mode)
    for (const [filePath] of this.files) {
      const name = this.basename(filePath);
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push({
          name,
          path: filePath,
          type: 'file' as const,
          size: this.files.get(filePath)?.length ?? 0,
          modified: new Date(),
        });
      }
    }

    // In Electron mode, also walk the provided root directory
    if (rootPath) {
      try {
        const electronResults = await this.searchDirectoryByName(rootPath, lowerQuery, 5);
        results.push(...electronResults);
      } catch (error) {
        logger.warn('[FileSystemService] Electron directory search failed:', error);
      }
    }

    return results;
  }

  /**
   * Recursively search a directory tree for files matching a name query.
   * Limits recursion depth to avoid traversing very deep trees.
   */
  private async searchDirectoryByName(
    dirPath: string,
    lowerQuery: string,
    maxDepth: number,
  ): Promise<FileSystemItem[]> {
    if (maxDepth <= 0) return [];

    const results: FileSystemItem[] = [];
    try {
      const entries = await this.listDirectory(dirPath);
      for (const entry of entries) {
        if (entry.name.toLowerCase().includes(lowerQuery)) {
          results.push(entry);
        }
        if (entry.type === 'directory') {
          const childResults = await this.searchDirectoryByName(
            entry.path,
            lowerQuery,
            maxDepth - 1,
          );
          results.push(...childResults);
        }
      }
    } catch (error) {
      logger.debug(`[FileSystemService] Could not search directory ${dirPath}:`, error);
    }
    return results;
  }

  /**
   * Search file contents for a text string (case-insensitive).
   * Returns matching lines with their line/column numbers.
   * Only searches in-memory files in web mode; in Electron mode also reads
   * files from the provided root path.
   */
  async searchFileContents(query: string, rootPath?: string): Promise<ContentSearchResult[]> {
    const lowerQuery = query.toLowerCase();
    const results: ContentSearchResult[] = [];

    // Search in-memory files
    for (const [filePath, content] of this.files) {
      const matches = this.findContentMatches(filePath, content, lowerQuery, query.length);
      results.push(...matches);
    }

    // In Electron mode, also search files from rootPath
    if (rootPath) {
      try {
        const fileItems = await this.searchDirectoryByName(rootPath, '', 3);
        for (const item of fileItems) {
          if (item.type !== 'file') continue;
          // Skip files we already searched in-memory
          if (this.files.has(item.path)) continue;
          try {
            const content = await this.readFile(item.path);
            const matches = this.findContentMatches(item.path, content, lowerQuery, query.length);
            results.push(...matches);
          } catch {
            // Skip unreadable files
          }
        }
      } catch (error) {
        logger.warn('[FileSystemService] Electron content search failed:', error);
      }
    }

    return results;
  }

  /** Find all occurrences of a query string within file content */
  private findContentMatches(
    filePath: string,
    content: string,
    lowerQuery: string,
    matchLength: number,
  ): ContentSearchResult[] {
    const results: ContentSearchResult[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const lowerLine = line.toLowerCase();
      let searchFrom = 0;

      while (searchFrom < lowerLine.length) {
        const col = lowerLine.indexOf(lowerQuery, searchFrom);
        if (col === -1) break;

        results.push({
          path: filePath,
          line: i + 1,
          column: col + 1,
          lineContent: line,
          matchLength,
        });
        searchFrom = col + 1;
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Path utility methods (public API -- also callable on the subclass)
  // ---------------------------------------------------------------------------

  joinPath(...paths: string[]): string {
    return paths.join('/').replace(/\/\/+/g, '/');
  }

  dirname(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return '.';
    }
    if (lastSlash === 0) {
      return '/';
    }
    return path.substring(0, lastSlash);
  }

  basename(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return path.substring(lastSlash + 1);
  }

  isAbsolute(path: string): boolean {
    // Check for Unix absolute paths (start with /)
    if (path.startsWith('/')) {
      return true;
    }
    // Check for Windows absolute paths (C:\, D:\, etc.)
    if (/^[a-zA-Z]:[/\\]/.test(path)) {
      return true;
    }
    return false;
  }

  relative(from: string, to: string): string {
    // Simplified relative path calculation
    if (!this.isAbsolute(from) || !this.isAbsolute(to)) {
      throw new Error('Both paths must be absolute');
    }

    const fromParts = from.split('/').filter(Boolean);
    const toParts = to.split('/').filter(Boolean);

    let commonLength = 0;
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++;
      } else {
        break;
      }
    }

    const upCount = fromParts.length - commonLength;
    const upParts = Array(upCount).fill('..');
    const remainingParts = toParts.slice(commonLength);

    return [...upParts, ...remainingParts].join('/') || '.';
  }

  async getDirectoryStructure(path: string): Promise<FileSystemItem> {
    const items = await this.listDirectory(path);
    return {
      name: this.basename(path) || '.',
      path,
      type: 'directory',
      children: items,
    };
  }

  async getFileInfo(path: string) {
    const stats = await this.getFileStats(path);
    return {
      ...stats,
      name: this.basename(path),
      path,
      type: (await this.isDirectory(path)) ? 'directory' : 'file',
    };
  }
}
