import { vi } from 'vitest';

// Mock electron store (in-memory key-value store for tests)
const mockElectronStore = new Map<string, any>();

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  writable: true,
  configurable: true,
  value: {
    store: {
      get: vi.fn((key: string) => mockElectronStore.get(key)),
      set: vi.fn((key: string, value: string) => mockElectronStore.set(key, value)),
      delete: vi.fn((key: string) => mockElectronStore.delete(key)),
    },
  },
});

// Mock window.electron
Object.defineProperty(window, 'electron', {
  writable: true,
  configurable: true,
  value: {
    isElectron: false,
    app: {
      getPath: vi.fn().mockResolvedValue('/mock/path'),
      getVersion: vi.fn().mockResolvedValue('1.0.0-test'),
      quit: vi.fn(),
      restart: vi.fn(),
    },
    dialog: {
      openFolder: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
      openFile: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
      saveFile: vi.fn().mockResolvedValue({ canceled: true }),
      showMessage: vi.fn().mockResolvedValue({ response: 0 }),
    },
    store: {
      get: vi.fn((key: string) => Promise.resolve(mockElectronStore.get(key))),
      set: vi.fn((key: string, value: string) => Promise.resolve(mockElectronStore.set(key, value))),
      delete: vi.fn((key: string) => Promise.resolve(mockElectronStore.delete(key))),
      getSync: vi.fn((key: string) => mockElectronStore.get(key)),
      setSync: vi.fn((key: string, value: string) => mockElectronStore.set(key, value)),
    },
    fs: {
      readFile: vi.fn().mockResolvedValue({ success: true, content: '' }),
      writeFile: vi.fn().mockResolvedValue({ success: true }),
      exists: vi.fn().mockResolvedValue({ success: true, exists: false }),
      readDir: vi.fn().mockResolvedValue({ success: true, files: [] }),
      createDir: vi.fn().mockResolvedValue({ success: true }),
      remove: vi.fn().mockResolvedValue({ success: true }),
      rename: vi.fn().mockResolvedValue({ success: true }),
      stat: vi.fn().mockResolvedValue({ success: true, stats: { isDirectory: false, size: 0 } }),
    },
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn().mockResolvedValue(false),
    },
    platform: {
      os: 'win32',
      arch: 'x64',
      version: '10.0.0',
      homedir: 'C:\\Users\\test',
      pathSeparator: '\\',
    },
    shell: {
      execute: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '' }),
      openExternal: vi.fn().mockResolvedValue({ success: true }),
    },
    api: {
      request: vi.fn().mockResolvedValue({ success: true, data: {} }),
    },
    storage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue({ success: true }),
      remove: vi.fn().mockResolvedValue({ success: true }),
      keys: vi.fn().mockResolvedValue([]),
    },
    db: {
      query: vi.fn().mockResolvedValue({ success: true, rows: [] }),
      initialize: vi.fn().mockResolvedValue({ success: true }),
    },
    learning: {
      recordMistake: vi.fn().mockResolvedValue({ success: true }),
      recordKnowledge: vi.fn().mockResolvedValue({ success: true }),
      findSimilarMistakes: vi.fn().mockResolvedValue([]),
      findKnowledge: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ totalMistakes: 0, totalKnowledge: 0 }),
      exportForSync: vi.fn().mockResolvedValue({ mistakes: [], knowledge: [] }),
      syncFromNova: vi.fn().mockResolvedValue({ success: true }),
    },
    getPlatform: vi.fn().mockResolvedValue({ os: 'win32', arch: 'x64' }),
    ipc: {
      send: vi.fn(),
      invoke: vi.fn().mockResolvedValue(null),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    ipcRenderer: {
      invoke: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
      removeListener: vi.fn(),
    },
    nova: {
      sendCommand: vi.fn().mockResolvedValue({ success: true }),
      notifyFileOpened: vi.fn().mockResolvedValue({ success: true }),
      sendLearningEvent: vi.fn().mockResolvedValue({ success: true }),
      isConnected: vi.fn().mockResolvedValue(false),
      getStats: vi.fn().mockResolvedValue({ connected: false }),
      onFileOpen: vi.fn(),
      onCommandRequest: vi.fn(),
      onContextUpdate: vi.fn(),
      onLearningEvent: vi.fn(),
      onClientDisconnected: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    ipcBridge: {
      send: vi.fn().mockResolvedValue({ success: true }),
      isConnected: vi.fn().mockResolvedValue(false),
      getStatus: vi.fn().mockResolvedValue({ connected: false }),
      reconnect: vi.fn().mockResolvedValue({ success: true }),
      onMessage: vi.fn().mockReturnValue(() => {}),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
      removeAllListeners: vi.fn(),
    },
  },
});
