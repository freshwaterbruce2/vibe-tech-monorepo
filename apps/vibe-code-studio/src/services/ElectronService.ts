/**
 * Electron Service - Matches preload.cjs API structure
 * Deep Code Editor - Electron IPC Bridge
 *
 * This service aligns EXACTLY with the window.electron API exposed
 * by electron/preload.cjs to ensure proper IPC communication
 */
import type { OpenDialogOptions, SaveDialogOptions } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, readDir, readTextFile, remove, rename, stat, writeTextFile } from '@tauri-apps/plugin-fs';
import { logger } from '../services/Logger';

// Types matching preload.cjs exposed API
interface ElectronFS {
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  readDir: (dirPath: string) => Promise<{ success: boolean; items?: Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean }>; error?: string }>;
  createDir: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
  remove: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
  rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  exists: (targetPath: string) => Promise<{ success: boolean; exists: boolean }>;
  stat: (targetPath: string) => Promise<{ success: boolean; stats?: { size: number; isFile: boolean; isDirectory: boolean; created: Date; modified: Date }; error?: string }>;
}

interface ElectronDialog {
  openFile: (options?: any) => Promise<{ success: boolean; canceled: boolean; filePaths: string[] }>;
  openFolder: (options?: any) => Promise<{ success: boolean; canceled: boolean; filePaths: string[] }>;
  saveFile: (options?: any) => Promise<{ success: boolean; canceled: boolean; filePath?: string }>;
}

interface ElectronShell {
  execute: (command: string, cwd?: string) => Promise<{ success: boolean; stdout: string; stderr: string; code: number }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
}

interface ElectronApp {
  getPath: (name: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  getPlatform: () => Promise<{ success: boolean; platform: string; arch: string; version: string; electron: string; node: string }>;
  restart: () => void;
}

interface ElectronWindow {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
}

interface ElectronDB {
  initialize: () => Promise<{ success: boolean; error?: string }>;
  execute: (sql: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
  query: (sql: string, params?: any[]) => Promise<{ success: boolean; rows?: any[]; data?: any[]; lastID?: number; error?: string }>;
  close: () => Promise<{ success: boolean; error?: string }>;
  getPatterns: () => Promise<{ success: boolean; patterns?: any[]; error?: string }>;
}

interface WindowElectron {
  fs: ElectronFS;
  dialog: ElectronDialog;
  shell: ElectronShell;
  app: ElectronApp;
  window?: ElectronWindow;
  db?: ElectronDB;
  store?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
    delete: (key: string) => Promise<any>;
  };
  apex?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
    delete: (key: string) => Promise<any>;
    initSemanticIndex: (path: string) => Promise<any>;
    updateSemanticIndex: (path: string, files: string[]) => Promise<any>;
    semanticSearch: (query: string, topK?: number) => Promise<any>;
    [key: string]: any;
  };
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electron?: WindowElectron;
    __ELECTRON__?: boolean;
  }
}

// Service to handle Electron API integration
export class ElectronService {
  private electron: WindowElectron | undefined;

  constructor() {
    this.electron = window.electron;
  }

  isElectron(): boolean {
    return !!window.electron?.isElectron || !!window.__ELECTRON__;
  }

  isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  get platform(): string {
    return this.electron?.platform ?? 'web';
  }

  // File System Operations (matches preload.cjs)
  async readFile(path: string): Promise<string> {
    if (this.isTauri()) {
      return await readTextFile(path);
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    const result = await this.electron.fs.readFile(path);
    if (!result.success || !result.content) {
      throw new Error(result.error ?? 'Failed to read file');
    }

    return result.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (this.isTauri()) {
      await writeTextFile(path, content);
      return;
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    const result = await this.electron.fs.writeFile(path, content);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to write file');
    }
  }

  async readDir(dirPath: string): Promise<Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean }>> {
    if (this.isTauri()) {
      try {
        const entries = await readDir(dirPath);
        return entries.map(entry => ({
          name: entry.name ?? 'unknown',
          path: `${dirPath}/${entry.name}`,
          isDirectory: entry.isDirectory,
          isFile: entry.isFile
        }));
      } catch (e: any) {
        logger.error('[ElectronService] readDir failed (Tauri):', e);
        throw new Error(e.message || String(e));
      }
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    logger.debug('[ElectronService] Reading directory:', dirPath);
    const result = await this.electron.fs.readDir(dirPath);

    if (!result.success) {
      const errorMsg = result.error ?? 'Failed to read directory';
      const isExpectedError = errorMsg.includes('ENOENT') || errorMsg.includes('No workspace folder approved yet');
      // Expected errors (ENOENT, no workspace) - log at debug level
      if (isExpectedError) {
        logger.debug('[ElectronService] readDir expected error:', errorMsg);
      } else {
        logger.error('[ElectronService] readDir failed:', errorMsg);
      }
      throw new Error(errorMsg);
    }

    logger.debug('[ElectronService] readDir success, got', result.items?.length ?? 0, 'items');
    return result.items ?? [];
  }

  async createDir(dirPath: string): Promise<void> {
    if (this.isTauri()) {
      await mkdir(dirPath, { recursive: true });
      return;
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    const result = await this.electron.fs.createDir(dirPath);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to create directory');
    }
  }

  /**
   * Alias for createDir (for compatibility)
   */
  async createDirectory(dirPath: string): Promise<void> {
    return this.createDir(dirPath);
  }

  async remove(targetPath: string): Promise<void> {
    if (this.isTauri()) {
      await remove(targetPath, { recursive: true });
      return;
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    const result = await this.electron.fs.remove(targetPath);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to remove file/directory');
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (this.isTauri()) {
      await rename(oldPath, newPath);
      return;
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    const result = await this.electron.fs.rename(oldPath, newPath);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to rename file/directory');
    }
  }

  async exists(targetPath: string): Promise<boolean> {
    if (this.isTauri()) {
      return await exists(targetPath);
    }

    if (!this.electron) {
      return false;
    }

    const result = await this.electron.fs.exists(targetPath);
    return result.exists;
  }

  async stat(targetPath: string): Promise<{ size: number; isFile: boolean; isDirectory: boolean; birthtime?: Date; mtime?: Date }> {
    if (this.isTauri()) {
      const info = await stat(targetPath);
      return {
        size: info.size,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        birthtime: (info as any).createdAt || (info as any).birthtime || undefined,
        mtime: (info as any).mtime || undefined,
      };
    }

    if (!this.electron) {
      throw new Error('Electron API not available');
    }

    const result = await this.electron.fs.stat(targetPath);
    if (!result.success || !result.stats) {
      throw new Error(result.error ?? 'Failed to get file stats');
    }

    return {
      size: result.stats.size,
      isFile: result.stats.isFile,
      isDirectory: result.stats.isDirectory,
      birthtime: result.stats.created,
      mtime: result.stats.modified,
    };
  }

  // Dialog Operations
  async openFileDialog(options?: any): Promise<{ canceled: boolean; filePaths: string[] }> {
    if (this.isTauri()) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        multiple: true,
        filters: options?.filters,
        ...(options || {}),
      } as OpenDialogOptions);
      if (result === null) return { canceled: true, filePaths: [] };
      return { canceled: false, filePaths: Array.isArray(result) ? result : [result] };
    }

    if (!this.electron) {
      throw new Error('Native API not available');
    }

    const result = await this.electron.dialog.openFile(options);
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  }

  async openFolderDialog(options?: any): Promise<{ canceled: boolean; filePaths: string[] }> {
    if (this.isTauri()) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        directory: true,
        multiple: false,
        ...(options || {}),
      } as OpenDialogOptions);
      if (result === null) return { canceled: true, filePaths: [] };
      return { canceled: false, filePaths: Array.isArray(result) ? result : [result] };
    }

    if (!this.electron) {
      throw new Error('Native API not available');
    }

    logger.debug('[ElectronService] Opening folder dialog...');
    const result = await this.electron.dialog.openFolder(options);
    logger.debug('[ElectronService] Dialog result:', result);

    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    };
  }

  async saveFileDialog(options?: any): Promise<{ canceled: boolean; filePath?: string }> {
    if (this.isTauri()) {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const result = await save({
        filters: options?.filters,
        ...(options || {}),
      } as SaveDialogOptions);
      if (result === null) return { canceled: true };
      return { canceled: false, filePath: result };
    }

    if (!this.electron) {
      throw new Error('Native API not available');
    }

    const result = await this.electron.dialog.saveFile(options);
    return {
      canceled: result.canceled,
      filePath: result.filePath,
    };
  }

  // Shell Operations
  async executeCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
    if (this.isTauri()) {
      const { Command } = await import('@tauri-apps/plugin-shell');
      try {
        const result = await Command.create('exec-cmd', ['-c', command], { cwd }).execute();
        return { stdout: result.stdout, stderr: result.stderr, code: result.code ?? 0 };
      } catch (err) {
        return { stdout: '', stderr: String(err), code: 1 };
      }
    }

    if (!this.electron) {
      throw new Error('Native API not available');
    }

    const result = await this.electron.shell.execute(command, cwd);
    return { stdout: result.stdout, stderr: result.stderr, code: result.code };
  }

  async openExternal(url: string): Promise<void> {
    if (this.isTauri()) {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
      return;
    }

    if (!this.electron) {
      window.open(url, '_blank');
      return;
    }

    const result = await this.electron.shell.openExternal(url);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to open external URL');
    }
  }

  // App Operations
  async getPath(name: string): Promise<string> {
    if (this.isTauri()) {
      // Tauri doesn't have a direct getPath equivalent; use known paths
      const { appDataDir, homeDir } = await import('@tauri-apps/api/path');
      if (name === 'userData' || name === 'appData') return await appDataDir();
      if (name === 'home') return await homeDir();
      return await appDataDir();
    }

    if (!this.electron) {
      throw new Error('Native API not available');
    }

    const result = await this.electron.app.getPath(name);
    if (!result.success || !result.path) {
      throw new Error(result.error ?? 'Failed to get path');
    }
    return result.path;
  }

  async getPlatform(): Promise<{ platform: string; arch: string; version: string }> {
    if (this.isTauri()) {
      const { platform, arch } = await import('@tauri-apps/plugin-os');
      return {
        platform: platform() ?? 'unknown',
        arch: arch() ?? 'unknown',
        version: '1.0.0-tauri',
      };
    }

    if (!this.electron) {
      return { platform: navigator.platform, arch: 'web', version: '1.0.0-web' };
    }

    const result = await this.electron.app.getPlatform();
    return { platform: result.platform, arch: result.arch, version: result.version };
  }

  async restart(): Promise<void> {
    if (this.isTauri()) {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
      return;
    }
    if (this.electron) {
      this.electron.app.restart();
    }
  }

  // Clipboard Operations
  async copyToClipboard(text: string): Promise<void> {
    // Use browser API - works in both Electron and web
    await navigator.clipboard.writeText(text);
  }

  async readFromClipboard(): Promise<string> {
    // Use browser API - works in both Electron and web
    return await navigator.clipboard.readText();
  }

  // Window Control Operations
  minimizeWindow(): void {
    if (!this.electron?.window) {
      logger.warn('[ElectronService] Window controls not available in web mode');
      return;
    }
    this.electron.window.minimize();
  }

  maximizeWindow(): void {
    if (!this.electron?.window) {
      logger.warn('[ElectronService] Window controls not available in web mode');
      return;
    }
    this.electron.window.maximize();
  }

  closeWindow(): void {
    if (!this.electron?.window) {
      logger.warn('[ElectronService] Window controls not available in web mode');
      return;
    }
    this.electron.window.close();
  }

  async isMaximized(): Promise<boolean> {
    if (!this.electron?.window) {
      return false;
    }
    return await this.electron.window.isMaximized();
  }

  // Store Operations (KV)
  async storeGet(key: string): Promise<any> {
    if (this.isTauri()) {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('store.json');
      return await store.get(key) ?? undefined;
    }

    if (this.electron?.store) {
      return await this.electron.store.get(key);
    }
    return undefined;
  }

  async storeSet(key: string, value: string): Promise<void> {
    if (this.isTauri()) {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('store.json');
      await store.set(key, value);
      return;
    }

    if (this.electron?.store) {
      await this.electron.store.set(key, value);
    }
  }

  async storeDelete(key: string): Promise<void> {
    if (this.isTauri()) {
      const { load } = await import('@tauri-apps/plugin-store');
      const store = await load('store.json');
      await store.delete(key);
      return;
    }

    if (this.electron?.store) {
      await this.electron.store.delete(key);
    }
  }

  /**
   * Generic IPC invoke method for Electron IPC
   */
  async invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.electron) {
      throw new Error('Electron API not available - invoke method only works in Electron');
    }

    if ((this.electron as any).invoke) {
      return (this.electron as any).invoke(channel, ...args);
    }

    throw new Error(`IPC invoke not available for channel: ${channel}`);
  }
}
