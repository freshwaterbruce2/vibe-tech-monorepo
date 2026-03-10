/* eslint-disable electron-security/no-localstorage-electron */
/**
 * Electron API Initialization
 *
 * Sets up window.electronAPI with a localStorage fallback for non-Electron environments.
 * MUST be imported at the very top of main.tsx before any other code runs.
 *
 * @module utils/electronInit
 * @description 2026 Best Practice - Guaranteed electronAPI availability
 */

import type { ElectronAPI, ElectronStoreAPI } from '../types/electron';

/**
 * Stub implementation for non-Electron environments.
 * Uses localStorage as a fallback for persistence.
 */
const electronStoreStub: ElectronStoreAPI = {
  get: (key: string): unknown => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown): void => {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch {
      // Ignore storage errors (e.g., quota exceeded)
    }
  },
  delete: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
  clear: (): void => {
    try {
      localStorage.clear();
    } catch {
      // Ignore storage errors
    }
  },
};

const electronAPIStub: ElectronAPI = {
  store: electronStoreStub,
  platform: 'web',
  isElectron: false,
  selectImportFile: async () => {
    console.warn('Import not supported in web mode');
    return null;
  },
  ingestAndroidExport: async () => {
    console.warn('Ingest not supported in web mode');
    return { inserted: 0, skipped: 0, total: 0 };
  },
};

/**
 * Initialize window.electronAPI if not already set by Electron preload.
 * Call this once at app startup.
 */
export function initElectronAPI(): void {
  if (typeof window === 'undefined') {
    return; // SSR guard
  }

  if (!window.electronAPI) {
    window.electronAPI = electronAPIStub;
    console.debug('[ElectronInit] Running in browser mode with localStorage fallback');
  } else {
    console.debug('[ElectronInit] Running in Electron mode with IPC bridge');
  }
}

/**
 * Check if running in actual Electron (not stub)
 */
export function isRealElectron(): boolean {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
}

// Auto-initialize on module load
initElectronAPI();

export { electronAPIStub, electronStoreStub };
