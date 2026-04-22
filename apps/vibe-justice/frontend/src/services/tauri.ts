/**
 * Tauri API Service Wrapper for Vibe-Justice
 *
 * This module provides a unified interface for Tauri IPC operations,
 * replacing Electron's contextBridge/ipcRenderer pattern.
 *
 * @module services/tauri
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { BrainScanResult } from '@/types/logic';

// ============================================================================
// Type Definitions
// ============================================================================

/** File dialog filter for specific file types */
export interface FileFilter {
  name: string;
  extensions: string[];
}

/** Options for opening file dialogs */
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
}

/** Options for save file dialogs */
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

/** Individual BrainScan match */
export interface BrainScanMatch {
  file: string;
  line: number;
  content: string;
  score: number;
}

/** Settings value type */
export type SettingValue = string | number | boolean | object | null;

/** Backend status response */
export interface BackendStatus {
  running: boolean;
  port: number;
  pid?: number;
  uptime?: number;
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Checks if the application is running in a Tauri environment.
 * This is useful for conditional logic when supporting both web and desktop.
 *
 * @returns True if running in Tauri, false otherwise
 * @example
 * if (isTauri()) {
 *   await tauriAPI.ping();
 * } else {
 *   console.log('Running in browser');
 * }
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/**
 * Checks if Tauri internals are available (for plugin access).
 * Some Tauri plugins require __TAURI_INTERNALS__ to be present.
 *
 * @returns True if Tauri internals are available
 */
export const hasTauriInternals = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// ============================================================================
// Tauri API Service
// ============================================================================

/**
 * Tauri API wrapper providing type-safe access to Tauri commands and plugins.
 * This replaces the window.vibeTech interface from Electron.
 */
export const tauriAPI = {
  // --------------------------------------------------------------------------
  // IPC Bridge / System
  // --------------------------------------------------------------------------

  /**
   * Ping the Tauri backend to verify IPC connectivity.
   *
   * @returns Promise resolving to "pong" on success
   * @throws Error if Tauri is not available or command fails
   */
  async ping(): Promise<string> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      return await invoke<string>('ping');
    } catch (error) {
      console.error('Failed to ping Tauri backend:', error);
      throw error;
    }
  },

  // --------------------------------------------------------------------------
  // Backend Management
  // --------------------------------------------------------------------------

  /**
   * Start the Python backend server.
   * This spawns the FastAPI/uvicorn process as a sidecar.
   *
   * @returns Promise resolving to status message
   * @throws Error if backend fails to start
   */
  async startBackend(): Promise<string> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      return await invoke<string>('start_backend');
    } catch (error) {
      console.error('Failed to start backend:', error);
      throw error;
    }
  },

  /**
   * Stop the Python backend server.
   *
   * @throws Error if backend fails to stop
   */
  async stopBackend(): Promise<void> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      await invoke<void>('stop_backend');
    } catch (error) {
      console.error('Failed to stop backend:', error);
      throw error;
    }
  },

  /**
   * Get the current status of the backend server.
   *
   * @returns Promise resolving to backend status
   */
  async getBackendStatus(): Promise<BackendStatus> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      return await invoke<BackendStatus>('get_backend_status');
    } catch (error) {
      console.error('Failed to get backend status:', error);
      throw error;
    }
  },

  // --------------------------------------------------------------------------
  // File Operations (via Tauri plugins)
  // --------------------------------------------------------------------------

  /**
   * Open a file picker dialog.
   *
   * @param options - Dialog configuration options
   * @returns Promise resolving to selected file paths (empty array if cancelled)
   * @example
   * const files = await tauriAPI.openFileDialog({
   *   title: 'Select Evidence',
   *   filters: [{ name: 'Documents', extensions: ['pdf', 'docx'] }],
   *   multiple: true
   * });
   */
  async openFileDialog(options: OpenDialogOptions = {}): Promise<string[]> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      const result = await open({
        title: options.title,
        defaultPath: options.defaultPath,
        filters: options.filters,
        multiple: options.multiple ?? false,
        directory: options.directory ?? false,
      });

      // Normalize result to always be an array
      if (result === null) {
        return [];
      }
      if (typeof result === 'string') {
        return [result];
      }
      return result;
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      throw error;
    }
  },

  /**
   * Open a save file dialog.
   *
   * @param options - Dialog configuration options
   * @returns Promise resolving to selected path (empty string if cancelled)
   * @example
   * const savePath = await tauriAPI.saveFileDialog({
   *   title: 'Export Report',
   *   defaultPath: 'analysis-report.pdf',
   *   filters: [{ name: 'PDF', extensions: ['pdf'] }]
   * });
   */
  async saveFileDialog(options: SaveDialogOptions = {}): Promise<string> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      const result = await save({
        title: options.title,
        defaultPath: options.defaultPath,
        filters: options.filters,
      });

      return result ?? '';
    } catch (error) {
      console.error('Failed to open save dialog:', error);
      throw error;
    }
  },

  /**
   * Read a text file from the filesystem.
   *
   * @param path - Absolute path to the file
   * @returns Promise resolving to file contents as string
   * @throws Error if file cannot be read
   */
  async readFile(path: string): Promise<string> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      return await readTextFile(path);
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  },

  /**
   * Write content to a text file.
   *
   * @param path - Absolute path to the file
   * @param content - Content to write
   * @throws Error if file cannot be written
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      await writeTextFile(path, content);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  },

  // --------------------------------------------------------------------------
  // Settings Management
  // --------------------------------------------------------------------------

  /**
   * Get a setting value.
   * Uses localStorage as fallback when Tauri command is not available.
   *
   * @param key - Setting key
   * @returns Promise resolving to setting value or null if not found
   */
  async getSetting<T = SettingValue>(key: string): Promise<T | null> {
    if (!isTauri()) {
      // Fallback to localStorage for web/dev mode
      const value = localStorage.getItem(`vibe-justice.${key}`);
      return value ? JSON.parse(value) : null;
    }
    try {
      return await invoke<T | null>('settings_get', { key });
    } catch (error) {
      console.error(`Failed to get setting "${key}":`, error);
      // Fallback to localStorage on error
      const value = localStorage.getItem(`vibe-justice.${key}`);
      return value ? JSON.parse(value) : null;
    }
  },

  /**
   * Set a setting value.
   * Uses localStorage as fallback when Tauri command is not available.
   *
   * @param key - Setting key
   * @param value - Setting value
   */
  async setSetting<T = SettingValue>(key: string, value: T): Promise<void> {
    if (!isTauri()) {
      // Fallback to localStorage for web/dev mode
      localStorage.setItem(`vibe-justice.${key}`, JSON.stringify(value));
      return;
    }
    try {
      await invoke<void>('settings_set', { key, value });
    } catch (error) {
      console.error(`Failed to set setting "${key}":`, error);
      // Fallback to localStorage on error
      localStorage.setItem(`vibe-justice.${key}`, JSON.stringify(value));
    }
  },

  // --------------------------------------------------------------------------
  // BrainScan Integration
  // --------------------------------------------------------------------------

  /**
   * Search for logic patterns using BrainScan.
   * This triggers a semantic search on the configured drives.
   *
   * @param snippet - Code snippet or search query
   * @param metadata - Optional metadata for search context
   * @returns Promise resolving to search results
   */
  async searchLogic(
    snippet: string,
    metadata?: Record<string, unknown>
  ): Promise<BrainScanResult> {
    if (!isTauri()) {
      throw new Error('Tauri is not available');
    }
    try {
      return await invoke<BrainScanResult>('brainscan_search', {
        snippet,
        metadata,
      });
    } catch (error) {
      console.error('Failed to search logic:', error);
      throw error;
    }
  },

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  /**
   * Subscribe to settings change events.
   *
   * @param callback - Function called when settings change
   * @returns Promise resolving to unsubscribe function
   */
  async onSettingsChanged(
    callback: (payload: { key: string; value: SettingValue }) => void
  ): Promise<UnlistenFn> {
    if (!isTauri()) {
      // Return no-op unsubscribe for non-Tauri environments
      return () => {};
    }
    return listen<{ key: string; value: SettingValue }>(
      'settings-changed',
      (event) => {
        callback(event.payload);
      }
    );
  },

  /**
   * Subscribe to BrainScan violation events.
   * These are triggered during background scanning when logic issues are found.
   *
   * @param callback - Function called when violations are detected
   * @returns Promise resolving to unsubscribe function
   */
  async onLogicViolation(
    callback: (violation: BrainScanMatch) => void
  ): Promise<UnlistenFn> {
    if (!isTauri()) {
      // Return no-op unsubscribe for non-Tauri environments
      return () => {};
    }
    return listen<BrainScanMatch>('brainscan-violation', (event) => {
      callback(event.payload);
    });
  },

  /**
   * Subscribe to backend status change events.
   *
   * @param callback - Function called when backend status changes
   * @returns Promise resolving to unsubscribe function
   */
  async onBackendStatusChanged(
    callback: (status: BackendStatus) => void
  ): Promise<UnlistenFn> {
    if (!isTauri()) {
      return () => {};
    }
    return listen<BackendStatus>('backend-status-changed', (event) => {
      callback(event.payload);
    });
  },
};

// ============================================================================
// Compatibility Layer
// ============================================================================

/**
 * Creates a window.vibeTech-compatible interface using Tauri APIs.
 * This allows gradual migration from Electron without changing component code.
 *
 * @returns Object compatible with window.vibeTech interface
 * @example
 * // In main.tsx or App.tsx
 * if (isTauri()) {
 *   window.vibeTech = createVibeTechBridge();
 * }
 */
export const createVibeTechBridge = () => ({
  searchLogic: tauriAPI.searchLogic,
  onLogicViolation: (callback: (violation: Record<string, unknown>) => void) => {
    tauriAPI.onLogicViolation(callback as unknown as (violation: BrainScanMatch) => void);
  },
  ping: tauriAPI.ping,
  getSetting: tauriAPI.getSetting,
  setSetting: tauriAPI.setSetting,
  onSettingsChanged: (callback: (value: unknown) => void) => {
    tauriAPI.onSettingsChanged(callback as unknown as (value: { key: string; value: SettingValue }) => void);
  },
});

// ============================================================================
// Default Export
// ============================================================================

export default tauriAPI;
