interface ElectronPlatformInfo {
  os: string;
  arch: string;
  version: string;
  homedir: string;
  pathSeparator: string;
}

interface ElectronStore {
  get: (key: string) => Promise<any>;
  set: (key: string, value: string) => Promise<any>;
  delete: (key: string) => Promise<any>;
  getSync?: (key: string) => any;
  setSync?: (key: string, value: string) => void;
}

interface WindowElectron {
  isElectron: boolean;
  isTauri?: boolean;
  app: {
    getPath: (name: string) => Promise<{ success?: boolean; path?: string; error?: string }>;
    getVersion: () => Promise<string> | string;
    quit?: () => void;
    restart: () => Promise<void> | void;
    getPlatform: () => Promise<{
      success?: boolean;
      platform: string;
      arch: string;
      version: string;
      electron?: string;
      node?: string;
    }>;
  };
  dialog: {
    openFolder: (options?: any) => Promise<{ success?: boolean; canceled: boolean; filePaths: string[]; error?: string }>;
    openFile: (options?: any) => Promise<{ success?: boolean; canceled: boolean; filePaths: string[]; error?: string }>;
    saveFile: (options?: any) => Promise<{ success?: boolean; canceled: boolean; filePath?: string; error?: string }>;
    showMessage: (options?: any) => Promise<{ success?: boolean; response?: number; checkboxChecked?: boolean; error?: string }>;
  };
  store?: ElectronStore;
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
  window?: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  platform: ElectronPlatformInfo | string;
  shell: {
    execute: (command: string, cwd?: string) => Promise<any>;
    openExternal: (url: string) => Promise<any>;
  };
  api?: {
    request: (options: { url: string; method: string; headers?: Record<string, string>; body?: any }) => Promise<any>;
  };
  storage?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
    remove: (key: string) => Promise<any>;
    keys: () => Promise<any>;
  };
  db?: {
    query: (sql: string, params?: unknown[]) => Promise<any>;
    initialize: () => Promise<any>;
    execute: (sql: string, params?: unknown[]) => Promise<any>;
    close: () => Promise<any>;
    getPatterns: () => Promise<any>;
  };
  learning?: {
    recordMistake: (mistake: any) => Promise<any>;
    recordKnowledge: (knowledge: any) => Promise<any>;
    findSimilarMistakes: (errorType: string, language: string, limit?: number) => Promise<any>;
    findKnowledge: (category: string, searchTerm: string, limit?: number) => Promise<any>;
    getStats: () => Promise<any>;
    exportForSync: (since?: string) => Promise<any>;
    syncFromNova: (mistakes: unknown[], knowledge: unknown[]) => Promise<any>;
  };
  apex?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
    delete: (key: string) => Promise<any>;
    initSemanticIndex: (path: string) => Promise<any>;
    updateSemanticIndex: (path: string, files: string[]) => Promise<any>;
    semanticSearch: (query: string, topK?: number) => Promise<any>;
    getStatus: () => Promise<any>;
    queryVector: (query: string, maxResults?: number) => Promise<any>;
    indexWorkspace: (path: string) => Promise<any>;
    [key: string]: any;
  };
  getPlatform?: () => Promise<any>;
  ipc?: {
    send: (channel: string, data?: any) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, func: (...args: any[]) => void) => (() => void) | void;
    once?: (channel: string, func: (...args: any[]) => void) => void;
    removeAllListeners?: (channel: string) => void;
  };
  ipcRenderer?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener?: (channel: string, listener: (...args: any[]) => void) => void;
  };
  invoke?: (channel: string, ...args: any[]) => Promise<any>;
  nova?: {
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
  ipcBridge?: {
    send: (message: Record<string, unknown>) => Promise<any>;
    isConnected: () => Promise<any>;
    getStatus: () => Promise<any>;
    reconnect: () => Promise<any>;
    onMessage: (handler: (msg: Record<string, unknown>) => void) => (() => void) | void;
    onStatusChange: (handler: (status: { connected: boolean }) => void) => (() => void) | void;
    removeAllListeners: () => void;
  };
}

declare global {
  interface Window {
    electron?: WindowElectron;
    electronAPI: {
      store: {
        get: (key: string) => any;
        set: (key: string, value: string) => void;
        delete: (key: string) => void;
      };
    };
    __ELECTRON__?: boolean;
  }
}

export { };
