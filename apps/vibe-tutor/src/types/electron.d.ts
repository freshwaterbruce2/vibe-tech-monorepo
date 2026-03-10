export interface IngestResult {
  inserted: number;
  skipped: number;
  total: number;
}

export interface ElectronStoreAPI {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
  clear: () => void;
}

export interface ElectronBridgeApi {
  selectImportFile: () => Promise<string | null>;
  ingestAndroidExport: (filePath: string) => Promise<IngestResult>;
  store: ElectronStoreAPI;
}

export interface ElectronAPI extends ElectronBridgeApi {
  platform?: string;
  isElectron?: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    __JAMENDO_CLIENT_ID__?: string;
  }
}

export { };
