import { logger } from '../services/Logger';
import type { FileSystemItem } from '../types';

import { ElectronService } from './ElectronService';
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

const STORAGE_KEY_FILES = 'vcs-fs-files';
const STORAGE_KEY_RECENT = 'vcs-fs-recent';
const STORAGE_KEY_TRACKED = 'vcs-fs-tracked';
const MAX_RECENT_FILES = 20;

export class FileSystemService {
  private files: Map<string, string> = new Map();
  private electronService: ElectronService;
  private isElectron: boolean;
  private recentFiles: string[] = [];
  private trackedFiles: Map<string, TrackedFile> = new Map();

  constructor() {
    this.electronService = new ElectronService();
    this.isElectron = this.electronService.isElectron();
    this.restoreFromStorage();
    if (!this.isElectron && this.files.size === 0) {
      this.initializeDemoFiles();
      this.persistToStorage();
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence with localStorage
  // ---------------------------------------------------------------------------

  /** Save file tree, recent files, and tracked file metadata to localStorage */
  private persistToStorage(): void {
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
  private restoreFromStorage(): void {
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
  private recordRecentFile(path: string): void {
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
  // Filtering by status
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

  private getDescendantPrefix(path: string): string {
    return path.endsWith('/') ? path : `${path}/`;
  }

  private remapNestedPath(path: string, oldPath: string, newPath: string): string {
    if (path === oldPath) {
      return newPath;
    }

    const oldPrefix = this.getDescendantPrefix(oldPath);
    if (!path.startsWith(oldPrefix)) {
      return path;
    }

    return `${newPath}${path.slice(oldPath.length)}`;
  }

  private getNestedFileEntries(path: string): Array<[string, string]> {
    const prefix = this.getDescendantPrefix(path);
    return Array.from(this.files.entries()).filter(([filePath]) => filePath.startsWith(prefix));
  }

  private hasInMemoryPath(path: string): boolean {
    return this.files.has(path) || this.getNestedFileEntries(path).length > 0;
  }

  private remapInMemoryReferences(oldPath: string, newPath: string): void {
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
    if (this.isElectron && rootPath) {
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
    if (this.isElectron && rootPath) {
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

  private initializeDemoFiles() {
    for (const [path, content] of DEMO_FILES) {
      this.files.set(path, content);
    }
  }

  /**
   * Check if a path is a virtual demo:// path that should be handled in-memory
   */
  private isVirtualPath(path: string): boolean {
    return path?.startsWith('demo://');
  }

  async readFile(path: string): Promise<string> {
    // Handle virtual demo:// paths in-memory (must be checked BEFORE Electron check)
    if (this.isVirtualPath(path)) {
      this.recordRecentFile(path);
      return this.files.get(path) ?? '';
    }

    if (this.isElectron || this.electronService.isElectron()) {
      // Use Electron filesystem API
      try {
        const content = await this.electronService.readFile(path);
        this.recordRecentFile(path);
        return content || '';
      } catch (error) {
        logger.error('Electron readFile error:', error);
        throw error;
      }
    }

    // Fallback to in-memory storage for web
    this.recordRecentFile(path);
    return this.files.get(path) ?? '';
  }

  async writeFile(path: string, content: string): Promise<void> {
    // Handle virtual demo:// paths in-memory (MUST be checked BEFORE Electron)
    if (this.isVirtualPath(path)) {
      const isNew = !this.files.has(path);
      this.files.set(path, content);
      this.trackFile(path, isNew ? 'new' : 'modified');
      this.recordRecentFile(path);
      this.persistToStorage();
      return;
    }

    // Extract parent directory and ensure it exists
    const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    if (lastSeparator > 0) {
      const parentDir = path.substring(0, lastSeparator);
      try {
        // Create parent directory if it doesn't exist
        await this.createDirectory(parentDir);
      } catch {
        // Ignore error if directory already exists
        logger.debug('[FileSystemService] Parent directory might already exist:', parentDir);
      }
    }

    if (this.isElectron) {
      // Use Electron filesystem API
      try {
        await this.electronService.writeFile(path, content);
        return;
      } catch (error) {
        logger.error('Electron writeFile error:', error);
        throw error;
      }
    }

    // Fallback to in-memory storage for web
    const isNew = !this.files.has(path);
    this.files.set(path, content);
    this.trackFile(path, isNew ? 'new' : 'modified');
    this.recordRecentFile(path);
    this.persistToStorage();
  }

  async createFile(path: string, content: string = ''): Promise<void> {
    if (this.isElectron) {
      try {
        if (await this.electronService.exists(path)) {
          throw new Error(`File already exists: ${path}`);
        }
        await this.electronService.writeFile(path, content);
        this.trackFile(path, 'new');
        this.recordRecentFile(path);
        return;
      } catch (error) {
        logger.error('[FileSystemService] Electron createFile error:', error);
        throw error;
      }
    }

    // Handle virtual demo:// paths in-memory
    if (this.isVirtualPath(path)) {
      if (this.files.has(path)) {
        throw new Error(`File already exists: ${path}`);
      }
      this.files.set(path, content);
      this.trackFile(path, 'new');
      this.recordRecentFile(path);
      this.persistToStorage();
      return;
    }

    // For non-virtual paths in web mode
    if (this.files.has(path)) {
      throw new Error(`File already exists: ${path}`);
    }
    this.files.set(path, content);
    this.trackFile(path, 'new');
    this.recordRecentFile(path);
    this.persistToStorage();
  }

  async deleteFile(path: string): Promise<void> {
    if (this.isElectron) {
      try {
        await this.electronService.remove(path);
        this.files.delete(path);
        this.trackFile(path, 'deleted');
        this.persistToStorage();
        return;
      } catch (error) {
        logger.error('[FileSystemService] Tauri deleteFile error:', error);
        throw error;
      }
    }

    if (this.electronService.isElectron()) {
      try {
        await this.electronService.remove(path);
        this.files.delete(path);
        this.trackFile(path, 'deleted');
        this.persistToStorage();
        return;
      } catch (error) {
        logger.error('[FileSystemService] Electron deleteFile error:', error);
        throw error;
      }
    }

    // Handle virtual demo:// paths in-memory
    if (this.isVirtualPath(path)) {
      if (!this.files.has(path)) {
        throw new Error(`File not found: ${path}`);
      }
      this.files.delete(path);
      this.trackFile(path, 'deleted');
      this.persistToStorage();
      return;
    }

    // For non-virtual paths in web mode
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
    this.trackFile(path, 'deleted');
    this.persistToStorage();
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (oldPath === newPath) {
      return;
    }

    if (this.isElectron) {
      await this.renameViaNative(oldPath, newPath, 'Tauri');
      return;
    }

    if (this.electronService.isElectron()) {
      await this.renameViaNative(oldPath, newPath, 'Electron');
      return;
    }

    const existing = this.files.get(oldPath);
    const descendantEntries = this.getNestedFileEntries(oldPath);
    if (existing === undefined && descendantEntries.length === 0) {
      throw new Error(`File not found: ${oldPath}`);
    }
    if (this.hasInMemoryPath(newPath)) {
      throw new Error(`File already exists: ${newPath}`);
    }

    if (existing !== undefined) {
      this.files.delete(oldPath);
      this.files.set(newPath, existing);
    }

    descendantEntries.forEach(([filePath, content]) => {
      this.files.delete(filePath);
      this.files.set(this.remapNestedPath(filePath, oldPath, newPath), content);
    });

    this.remapInMemoryReferences(oldPath, newPath);
    this.untrackFile(oldPath);
    this.trackFile(newPath, 'renamed', oldPath);
    this.recordRecentFile(newPath);
    this.persistToStorage();
  }

  private async renameViaNative(
    oldPath: string,
    newPath: string,
    label: string,
  ): Promise<void> {
    try {
      await this.electronService.rename(oldPath, newPath);
      if (this.files.has(oldPath)) {
        const content = this.files.get(oldPath) ?? '';
        this.files.delete(oldPath);
        this.files.set(newPath, content);
      }
      this.untrackFile(oldPath);
      this.trackFile(newPath, 'renamed', oldPath);
      this.recordRecentFile(newPath);
    } catch (error) {
      logger.error(`[FileSystemService] ${label} rename error:`, error);
      throw error;
    }
  }

  async createDirectory(path: string): Promise<void> {
    if (this.isElectron) {
      try {
        await this.electronService.createDir(path);
        logger.debug(`[FileSystemService] Created directory: ${path}`);
        return;
      } catch (error) {
        logger.error('[FileSystemService] Tauri createDirectory error:', error);
        throw error;
      }
    }

    if (this.electronService.isElectron()) {
      try {
        await this.electronService.createDirectory(path);
        logger.debug(`[FileSystemService] Created directory via Electron: ${path}`);
        return;
      } catch (error) {
        logger.error('[FileSystemService] Electron createDirectory error:', error);
        throw error;
      }
    }

    // For web/demo mode, just track it (no-op for in-memory filesystem)
    logger.debug(`[FileSystemService] Skipping directory creation in web mode: ${path}`);
  }

  async listDirectory(path: string): Promise<FileSystemItem[]> {
    // Handle virtual demo:// paths in-memory (must be checked BEFORE Electron check)
    if (this.isVirtualPath(path)) {
      return this.listVirtualDirectory(path);
    }

    if (this.isElectron) {
      return this.listElectronDirectory(path);
    }

    logger.warn('[FileSystemService] Directory listing not available in web mode for path:', path);
    return [];
  }

  private listVirtualDirectory(path: string): FileSystemItem[] {
    if (path === 'demo://workspace') {
      // Dynamically derive file list from the in-memory Map
      const items: FileSystemItem[] = [];
      const prefix = 'demo://workspace/';

      for (const [filePath] of this.files) {
        if (filePath.startsWith(prefix)) {
          const name = filePath.substring(prefix.length);
          // Only include direct children (no subdirectories in path)
          if (!name.includes('/')) {
            items.push({
              name,
              path: filePath,
              type: 'file' as const,
              size: this.files.get(filePath)?.length ?? 0,
              modified: new Date(),
            });
          }
        }
      }
      return items;
    }
    // Other virtual paths return empty
    return [];
  }

  private async listElectronDirectory(path: string): Promise<FileSystemItem[]> {
    // Use Electron filesystem API (matches preload.cjs)
    try {
      logger.debug('[FileSystemService] Listing directory via Electron:', path);
      const entries = await this.electronService.readDir(path);

      logger.debug('[FileSystemService] Got', entries.length, 'entries from Electron');

      const items: FileSystemItem[] = [];
      for (const entry of entries) {
        // Normalize path separators - always use forward slash
        const normalizedPath = entry.path.replace(/\\/g, '/');

        items.push({
          name: entry.name,
          path: normalizedPath,
          type: entry.isDirectory ? ('directory' as const) : ('file' as const),
          size: 0, // Size will be fetched separately if needed
          modified: new Date(),
        });
      }

      logger.debug('[FileSystemService] Returning', items.length, 'items');
      return items;
    } catch (error) {
      // Handle expected errors gracefully - return empty array
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isExpectedError =
        errorMsg.includes('ENOENT') || errorMsg.includes('No workspace folder approved yet');
      if (isExpectedError) {
        logger.debug('[FileSystemService] Expected error, returning empty:', errorMsg);
        return [];
      }
      logger.error('[FileSystemService] Electron listDirectory error:', error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    // Handle virtual demo:// paths in-memory
    if (this.isVirtualPath(path)) {
      return this.hasInMemoryPath(path);
    }

    if (this.isElectron) {
      try {
        return await this.electronService.exists(path);
      } catch (error) {
        logger.error('[FileSystemService] Tauri exists error:', error);
        return false;
      }
    }

    if (this.electronService.isElectron()) {
      try {
        await this.electronService.readFile(path);
        return true;
      } catch {
        return false;
      }
    }

    return this.hasInMemoryPath(path);
  }

  async isDirectory(path: string): Promise<boolean> {
    // Handle virtual demo:// paths in-memory
    if (this.isVirtualPath(path)) {
      return !this.files.has(path) && this.hasInMemoryPath(path);
    }

    if (this.isElectron) {
      try {
        const stats = await this.electronService.stat(path);
        return stats.isDirectory;
      } catch {
        return false;
      }
    }

    if (this.hasInMemoryPath(path)) {
      return !this.files.has(path);
    }

    // Simple check for demo purposes in web mode
    return !path.includes('.');
  }

  async getFileStats(path: string) {
    // Handle virtual demo:// paths in-memory
    if (this.isVirtualPath(path)) {
      const content = this.files.get(path) ?? '';
      return {
        size: content.length,
        created: new Date(),
        modified: new Date(),
        isDirectory: path === 'demo://workspace',
      };
    }

    if (this.isElectron) {
      try {
        const stats = await this.electronService.stat(path);
        return {
          size: stats.size,
          created: stats.birthtime ? new Date(stats.birthtime) : new Date(),
          modified: stats.mtime ? new Date(stats.mtime) : new Date(),
          isDirectory: stats.isDirectory,
        };
      } catch (error) {
        // File doesn't exist or can't be accessed
        throw new Error(`Failed to get file stats: ${error}`);
      }
    }

    if (this.electronService.isElectron()) {
      // Electron mode - try to read file to check if it exists
      try {
        const content = await this.electronService.readFile(path);
        return {
          size: content?.length || 0,
          created: new Date(),
          modified: new Date(),
          isDirectory: false, // Electron readFile only works on files
        };
      } catch (error) {
        throw new Error(`Failed to get file stats: ${error}`);
      }
    }

    // Web mode - fallback to in-memory storage
    const content = this.files.get(path) ?? '';
    return {
      size: content.length,
      created: new Date(),
      modified: new Date(),
      isDirectory: await this.isDirectory(path),
    };
  }

  // Path utility methods
  joinPath(...paths: string[]): string {
    return paths.join('/').replace(/\/\/+/g, '/');
  }

  /**
   * Resolves a file path against workspace root
   * Handles both relative and absolute paths
   */
  resolveWorkspacePath(path: string, workspaceRoot?: string): string {
    // If path is already absolute, just normalize and return
    if (this.isAbsolute(path)) {
      const normalized = path.replace(/\\/g, '/');
      logger.debug(`[FileSystemService] Path already absolute: "${path}" → "${normalized}"`);
      return normalized;
    }

    // If no workspace root provided, return path as-is
    if (!workspaceRoot) {
      logger.debug(`[FileSystemService] No workspace root, using path as-is: "${path}"`);
      return path;
    }

    // Normalize separators (handle Windows backslashes)
    const normalizedPath = path.replace(/\\/g, '/');
    const normalizedRoot = workspaceRoot.replace(/\\/g, '/');

    // Join workspace root with relative path
    const resolved = this.joinPath(normalizedRoot, normalizedPath);

    logger.debug(
      `[FileSystemService] Resolved path: "${path}" → "${resolved}" (workspace: ${workspaceRoot})`,
    );
    return resolved;
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
