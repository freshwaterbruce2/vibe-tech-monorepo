// Type definitions for Electron API exposed through preload script

declare global {
  interface Window {
    electron?: {
      isElectron: boolean;

      // App methods
      app: {
        getPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'logs') => Promise<any>;
        getVersion: () => Promise<string>;
        quit: () => void;
        restart: () => void;
      };

      // Dialog methods (THE FIX!)
      dialog: {
        openFolder: (options?: any) => Promise<{ success?: boolean; canceled: boolean; filePaths: string[]; error?: string }>;
        openFile: (options?: any) => Promise<{ success?: boolean; canceled: boolean; filePaths: string[]; error?: string }>;
        saveFile: (options?: any) => Promise<{ success?: boolean; canceled: boolean; filePath?: string; error?: string }>;
        showMessage: (options?: any) => Promise<{ success?: boolean; response?: number; checkboxChecked?: boolean; error?: string }>;
      };

      // Store
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<any>;
        delete: (key: string) => Promise<any>;
        getSync: (key: string) => any;
        setSync: (key: string, value: string) => void;
      };

      // File system
      fs: {
        readFile: (filePath: string) => Promise<any>;
        writeFile: (filePath: string, content: string) => Promise<any>;
        exists: (filePath: string) => Promise<any>;
        readDir: (dirPath: string) => Promise<any>;
        createDir: (dirPath: string) => Promise<any>;
        remove: (targetPath: string) => Promise<any>;
        rename: (oldPath: string, newPath: string) => Promise<any>;
        stat: (targetPath: string) => Promise<any>;
      };

      // Window controls
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
      };

      // Platform info
      platform: {
        os: string;
        arch: string;
        version: string;
        homedir: string;
        pathSeparator: string;
      };

      // Shell operations
      shell: {
        execute: (command: string, cwd?: string) => Promise<any>;
        openExternal: (url: string) => Promise<any>;
      };

      // API proxy
      api: {
        request: (options: { url: string; method: string; headers?: Record<string, string>; body?: any }) => Promise<any>;
      };

      // Secure storage
      storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<any>;
        remove: (key: string) => Promise<any>;
        keys: () => Promise<any>;
      };

      // Database
      db: {
        query: (sql: string, params?: unknown[]) => Promise<any>;
        initialize: () => Promise<any>;
      };

      // Learning system
      learning: {
        recordMistake: (mistake: any) => Promise<any>;
        recordKnowledge: (knowledge: any) => Promise<any>;
        findSimilarMistakes: (errorType: string, language: string, limit?: number) => Promise<any>;
        findKnowledge: (category: string, searchTerm: string, limit?: number) => Promise<any>;
        getStats: () => Promise<any>;
        exportForSync: (since?: string) => Promise<any>;
        syncFromNova: (mistakes: unknown[], knowledge: unknown[]) => Promise<any>;
      };

      // Platform info
      getPlatform: () => Promise<any>;

      // IPC
      ipc: {
        send: (channel: string, data: any) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, func: (...args: any[]) => void) => (() => void) | void;
        once: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };

      // Nova integration
      nova: {
        sendCommand: (command: string, context?: Record<string, unknown>) => Promise<any>;
        notifyFileOpened: (filePath: string, content?: string) => Promise<any>;
        sendLearningEvent: (eventType: string, data: Record<string, unknown>) => Promise<any>;
        isConnected: () => Promise<any>;
        getStats: () => Promise<any>;
        onFileOpen: (callback: (data: any) => void) => void;
        onCommandRequest: (callback: (data: any) => void) => void;
        onContextUpdate: (callback: (data: any) => void) => void;
        onLearningEvent: (callback: (data: any) => void) => void;
        onClientDisconnected: (callback: (data: any) => void) => void;
        removeAllListeners: () => void;
      };

      // IPC Bridge
      ipcBridge: {
        send: (message: Record<string, unknown>) => Promise<any>;
        isConnected: () => Promise<any>;
        getStatus: () => Promise<any>;
        reconnect: () => Promise<any>;
        onMessage: (handler: (msg: Record<string, unknown>) => void) => () => void;
        onStatusChange: (handler: (status: { connected: boolean }) => void) => () => void;
        removeAllListeners: () => void;
      };
    };
    electronAPI: {
      store: {
        get: (key: string) => any;
        set: (key: string, value: string) => void;
        delete: (key: string) => void;
      };
    };
  }
}

export { };
