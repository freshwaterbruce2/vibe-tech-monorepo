/*
 * Electron preload (secure context bridge)
 *
 * Exposes a minimal, explicit API to the renderer via contextBridge.
 * Renderer must NOT access Node/Electron primitives directly.
 */

import { contextBridge, ipcRenderer } from 'electron';

interface IngestResult {
  inserted: number;
  skipped: number;
  total: number;
}

type IpcIngestResponse = { ok: true; result: IngestResult } | { ok: false; error: string };

const api = {
  selectImportFile: async (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:openFile');
  },

  ingestAndroidExport: async (filePath: string): Promise<IngestResult> => {
    const response: IpcIngestResponse = await ipcRenderer.invoke('ingest-export', { filePath });

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response from ingest-export');
    }

    if (response.ok === true) {
      return response.result;
    }

    throw new Error('error' in response && response.error ? response.error : 'Ingestion failed');
  },

  // Local LLM model lifecycle (@electron/llm). Inference itself goes through
  // window.electronAi, injected separately by @electron/llm's own preload.
  localLlm: {
    getStatus: async (): Promise<{ state: string; progress: number }> => {
      return ipcRenderer.invoke('local-llm:status');
    },
    downloadModel: async (): Promise<{ ok: boolean; state?: string; error?: string }> => {
      return ipcRenderer.invoke('local-llm:download');
    },
    cancelDownload: async (): Promise<void> => {
      await ipcRenderer.invoke('local-llm:cancel-download');
    },
    onDownloadProgress: (callback: (loaded: number) => void): (() => void) => {
      const listener = (_event: unknown, payload: { loaded: number }) => {
        callback(payload.loaded);
      };
      ipcRenderer.on('local-llm:download-progress', listener);
      return () => {
        ipcRenderer.removeListener('local-llm:download-progress', listener);
      };
    },
  },

  // Electron-store IPC bridge (synchronous for backward compatibility)
  store: {
    get: (key: string): unknown => {
      return ipcRenderer.sendSync('store:get', key);
    },
    set: (key: string, value: unknown): void => {
      ipcRenderer.sendSync('store:set', key, value);
    },
    delete: (key: string): void => {
      ipcRenderer.sendSync('store:delete', key);
    },
    clear: (): void => {
      ipcRenderer.sendSync('store:clear');
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronBridgeApi = typeof api;
