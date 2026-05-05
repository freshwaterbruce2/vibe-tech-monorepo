import { logger } from '../services/Logger';
import type { FileSystemItem } from '../types';

import { ElectronService } from './ElectronService';

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
    // Pre-populate demo files for web mode (Windows 11 - using virtual demo:// protocol)
    this.files.set(
      'demo://workspace/index.js',
      `// Demo JavaScript file for testing AI features

class TodoApp {
  constructor() {
    this.todos = [];
    this.nextId = 1;
  }

  addTodo(text) {
    const todo = {
      id: this.nextId++,
      text,
      completed: false,
      createdAt: new Date()
    };
    this.todos.push(todo);
    return todo;
  }

  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
    return todo;
  }

  deleteTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index !== -1) {
      return this.todos.splice(index, 1)[0];
    }
    return null;
  }

  getTodos() {
    return this.todos;
  }
}

// Persistence: save/load todos from localStorage
  save() {
    localStorage.setItem('todos', JSON.stringify(this.todos));
    localStorage.setItem('nextId', String(this.nextId));
  }

  load() {
    try {
      const saved = localStorage.getItem('todos');
      if (saved) {
        this.todos = JSON.parse(saved);
        this.nextId = parseInt(localStorage.getItem('nextId') || '1', 10);
      }
    } catch (e) {
      logger.error('Failed to load todos:', e);
    }
  }

  // Filter todos by completion status: 'all' | 'active' | 'completed'
  filterByStatus(status) {
    if (status === 'active') return this.todos.filter(t => !t.completed);
    if (status === 'completed') return this.todos.filter(t => t.completed);
    return this.todos;
  }

  // Search todos by text (case-insensitive)
  search(query) {
    if (!query || !query.trim()) return this.todos;
    const lower = query.toLowerCase();
    return this.todos.filter(t => t.text.toLowerCase().includes(lower));
  }
}

module.exports = TodoApp;`,
    );

    this.files.set(
      'demo://workspace/README.md',
      `# Demo Workspace

This is a demo workspace for testing the Vibe Code Studio with Cursor IDE features.

## Features to Test

1. **Multi-Model AI Support**
   - Use the Model Selector in the title bar
   - Switch between OpenAI, Anthropic, and DeepSeek models

2. **Agent Mode (Ctrl+Shift+A)**
   - Launch autonomous coding agent
   - Describe complex tasks and watch them execute

3. **Terminal Integration**
   - Click Terminal button in status bar
   - Run commands in integrated terminal

## Quick Start

1. Open a file from the sidebar
2. Try AI-powered code completion
3. Use Agent Mode for complex tasks
4. Open the integrated terminal`,
    );

    // Add more demo files
    this.files.set(
      'demo://workspace/styles.css',
      `/* Demo CSS file for testing styling features */

.todo-app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.todo-header {
  text-align: center;
  margin-bottom: 30px;
}

.todo-header h1 {
  color: #333;
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.todo-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-input input {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.todo-input input:focus {
  outline: none;
  border-color: #4CAF50;
}

.todo-input button {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.todo-input button:hover {
  background: #45a049;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.todo-item.completed {
  opacity: 0.6;
  text-decoration: line-through;
  border-left-color: #ccc;
}

.todo-item input[type="checkbox"] {
  margin-right: 12px;
  transform: scale(1.2);
}

.todo-item span {
  flex: 1;
  font-size: 16px;
}

.todo-item button {
  background: #ff4444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.todo-item button:hover {
  background: #cc0000;
}`,
    );

    this.files.set(
      'demo://workspace/utils.js',
      `// Utility functions for the Todo App

/**
 * Format a date to a readable string
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Filter todos based on completion status
 * @param {Array} todos - Array of todo items
 * @param {string} filter - Filter type: 'all', 'active', 'completed'
 * @returns {Array} Filtered todos
 */
function filterTodos(todos, filter) {
  switch (filter) {
    case 'active':
      return todos.filter(todo => !todo.completed);
    case 'completed':
      return todos.filter(todo => todo.completed);
    default:
      return todos;
  }
}

/**
 * Search todos by text content
 * @param {Array} todos - Array of todo items
 * @param {string} searchTerm - Search term
 * @returns {Array} Matching todos
 */
function searchTodos(todos, searchTerm) {
  if (!searchTerm.trim()) {
    return todos;
  }

  const term = searchTerm.toLowerCase();
  return todos.filter(todo =>
    todo.text.toLowerCase().includes(term)
  );
}

module.exports = {
  formatDate,
  generateId,
  debounce,
  filterTodos,
  searchTodos
};`,
    );
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
      } catch (_error) {
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
      if (await this.electronService.exists(path)) {
        throw new Error(`File already exists: ${path}`);
      }
      await this.writeFile(path, content);
      this.trackFile(path, 'new');
      return;
    }

    if (this.electronService.isElectron()) {
      if (await this.electronService.exists(path)) {
        throw new Error(`File already exists: ${path}`);
      }
      await this.electronService.writeFile(path, content);
      this.trackFile(path, 'new');
      this.recordRecentFile(path);
      return;
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
      await this.electronService.remove(path);
      this.files.delete(path);
      this.trackFile(path, 'deleted');
      this.persistToStorage();
      return;
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
        return;
      } catch (error) {
        logger.error('[FileSystemService] Tauri rename error:', error);
        throw error;
      }
    }

    if (this.electronService.isElectron()) {
      await this.electronService.rename(oldPath, newPath);
      if (this.files.has(oldPath)) {
        const content = this.files.get(oldPath) ?? '';
        this.files.delete(oldPath);
        this.files.set(newPath, content);
      }
      this.untrackFile(oldPath);
      this.trackFile(newPath, 'renamed', oldPath);
      this.recordRecentFile(newPath);
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
      await this.electronService.createDirectory(path);
      logger.debug(`[FileSystemService] Created directory via Electron: ${path}`);
      return;
    }

    // For web/demo mode, just track it (no-op for in-memory filesystem)
    logger.debug(`[FileSystemService] Skipping directory creation in web mode: ${path}`);
  }

  async listDirectory(path: string): Promise<FileSystemItem[]> {
    // Handle virtual demo:// paths in-memory (must be checked BEFORE Electron check)
    if (this.isVirtualPath(path)) {
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

    if (this.isElectron) {
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

    logger.warn('[FileSystemService] Directory listing not available in web mode for path:', path);
    return [];
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
