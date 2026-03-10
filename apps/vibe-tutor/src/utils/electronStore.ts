/**
 * Electron-safe storage abstraction for Vibe Tutor
 *
 * Uses window.electronAPI.store (IPC bridge) when in Electron context,
 * falls back to localStorage for web/PWA/Capacitor contexts.
 *
 * NOTE: After electronInit.ts runs, window.electronAPI is ALWAYS defined
 * with either real Electron IPC or localStorage fallback.
 *
 * @module utils/electronStore
 * @description 2026 Best Practice - Type-safe storage with graceful fallback
 */

// Ensure electronInit has run
import './electronInit';

export interface AppStore {
  get<T = string>(key: string): T | null;
  set<T = string>(key: string, value: T): void;
  remove(key: string): void;
  delete(key: string): void;
}

/**
 * Check if we're running in real Electron (not the stub)
 */
function isRealElectron(): boolean {
  return window.electronAPI?.isElectron === true;
}

/**
 * Unified storage that works across Electron (IPC bridge) and Web (localStorage)
 * After electronInit, window.electronAPI is always available.
 */
export const appStore: AppStore = {
  get<T = string>(key: string): T | null {
    try {
      const value = window.electronAPI.store.get(key);
      if (value === null || value === undefined) return null;

      try {
        return JSON.parse(value as string) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`[AppStore] Failed to get '${key}':`, error);
      return null;
    }
  },

  set<T = string>(key: string, value: T): void {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      window.electronAPI.store.set(key, serialized);
    } catch (error) {
      console.error(`[AppStore] Failed to set '${key}':`, error);
    }
  },

  remove(key: string): void {
    try {
      window.electronAPI.store.delete(key);
    } catch (error) {
      console.error(`[AppStore] Failed to remove '${key}':`, error);
    }
  },

  delete(key: string): void {
    this.remove(key);
  },
};

/**
 * Session-specific storage
 * In Electron: persisted with 'session_' prefix
 * In Web/PWA: uses sessionStorage (clears on tab close)
 */
export const sessionStore: AppStore = {
  get<T = string>(key: string): T | null {
    try {
      if (isRealElectron()) {
        const value = window.electronAPI.store.get(`session_${key}`);
        if (value === null || value === undefined) return null;

        try {
          return JSON.parse(value as string) as T;
        } catch {
          return value as unknown as T;
        }
      }

      // Fallback to sessionStorage for web/PWA/Capacitor
      // eslint-disable-next-line electron-security/no-localstorage-electron -- Safe: only used in non-Electron contexts
      const value = sessionStorage.getItem(key);
      if (value === null) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`[SessionStore] Failed to get '${key}':`, error);
      return null;
    }
  },

  set<T = string>(key: string, value: T): void {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (isRealElectron()) {
        window.electronAPI.store.set(`session_${key}`, serialized);
        return;
      }

      // eslint-disable-next-line electron-security/no-localstorage-electron -- Safe: only used in non-Electron contexts
      sessionStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`[SessionStore] Failed to set '${key}':`, error);
    }
  },

  remove(key: string): void {
    try {
      if (isRealElectron()) {
        window.electronAPI.store.delete(`session_${key}`);
        return;
      }

      // eslint-disable-next-line electron-security/no-localstorage-electron -- Safe: only used in non-Electron contexts
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`[SessionStore] Failed to remove '${key}':`, error);
    }
  },

  delete(key: string): void {
    this.remove(key);
  },
};

export default appStore;
