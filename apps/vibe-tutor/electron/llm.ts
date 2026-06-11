/*
 * Local LLM bridge (@electron/llm).
 *
 * Chrome's built-in Gemini Nano cannot run inside Electron (the model ships
 * through Chrome's proprietary component updater), so the desktop build uses
 * @electron/llm with a locally stored GGUF model instead. The renderer talks
 * to it through window.electronAi (auto-injected preload) for inference and
 * through the IPC channels below for model download lifecycle.
 *
 * Model weights are data, not code: they live under D:\ per the workspace
 * paths policy (override with VIBE_TUTOR_MODELS_PATH).
 */

import { loadElectronLlm } from '@electron/llm';
import { ipcMain, net, type IpcMainInvokeEvent } from 'electron';
import { createWriteStream, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const MODELS_DIR = process.env.VIBE_TUTOR_MODELS_PATH ?? String.raw`D:\data\vibe-tutor\models`;

export const LOCAL_MODEL_ALIAS = 'study-helper';

const MODEL_FILES: Record<string, string> = {
  [LOCAL_MODEL_ALIAS]: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
};

const MODEL_URL =
  'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf';

// Used as the progress denominator if the server omits Content-Length.
const APPROX_MODEL_BYTES = 2_020_000_000;

type DownloadState = 'downloadable' | 'downloading' | 'available';

interface LocalLlmStatus {
  state: DownloadState;
  progress: number;
}

let activeDownload: { abort: () => void } | null = null;
let downloadProgress = 0;

function modelPath(alias: string): string {
  return path.join(MODELS_DIR, MODEL_FILES[alias] ?? alias);
}

function currentStatus(): LocalLlmStatus {
  if (existsSync(modelPath(LOCAL_MODEL_ALIAS))) {
    return { state: 'available', progress: 1 };
  }
  if (activeDownload) {
    return { state: 'downloading', progress: downloadProgress };
  }
  return { state: 'downloadable', progress: 0 };
}

async function downloadModel(event: IpcMainInvokeEvent): Promise<void> {
  return new Promise((resolve, reject) => {
    mkdirSync(MODELS_DIR, { recursive: true });

    const finalPath = modelPath(LOCAL_MODEL_ALIAS);
    const partialPath = `${finalPath}.partial`;
    const request = net.request(MODEL_URL);
    const file = createWriteStream(partialPath);
    let received = 0;

    const fail = (error: Error) => {
      file.close(() => {
        try {
          unlinkSync(partialPath);
        } catch {
          // partial file may not exist
        }
        reject(error);
      });
    };

    activeDownload = { abort: () => request.abort() };

    request.on('response', (response) => {
      const lengthHeader = response.headers['content-length'];
      const total = Number(Array.isArray(lengthHeader) ? lengthHeader[0] : lengthHeader);
      const totalBytes = Number.isFinite(total) && total > 0 ? total : APPROX_MODEL_BYTES;

      if (response.statusCode < 200 || response.statusCode >= 300) {
        fail(new Error(`Model download failed with HTTP ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => {
        received += chunk.length;
        downloadProgress = Math.min(received / totalBytes, 0.999);
        file.write(chunk);
        if (!event.sender.isDestroyed()) {
          event.sender.send('local-llm:download-progress', { loaded: downloadProgress });
        }
      });

      response.on('end', () => {
        file.end(() => {
          renameSync(partialPath, finalPath);
          downloadProgress = 1;
          if (!event.sender.isDestroyed()) {
            event.sender.send('local-llm:download-progress', { loaded: 1 });
          }
          resolve();
        });
      });

      response.on('error', (error: Error) => fail(error));
    });

    request.on('error', (error) => fail(error));
    request.on('abort', () => fail(new Error('Model download cancelled')));
    request.end();
  });
}

export function registerLocalLlmIpc(assertTrustedIpcSender: (event: unknown) => void): void {
  ipcMain.handle('local-llm:status', (event) => {
    assertTrustedIpcSender(event);
    return currentStatus();
  });

  ipcMain.handle('local-llm:download', async (event) => {
    assertTrustedIpcSender(event);

    if (currentStatus().state !== 'downloadable') {
      return { ok: true, state: currentStatus().state };
    }

    try {
      await downloadModel(event);
      return { ok: true, state: 'available' as DownloadState };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[local-llm] download failed:', message);
      return { ok: false, error: message };
    } finally {
      activeDownload = null;
      downloadProgress = 0;
    }
  });

  ipcMain.handle('local-llm:cancel-download', (event) => {
    assertTrustedIpcSender(event);
    activeDownload?.abort();
    return { ok: true };
  });
}

export async function setupLocalLlm(): Promise<void> {
  mkdirSync(MODELS_DIR, { recursive: true });

  await loadElectronLlm({
    getModelPath: (alias: string) => modelPath(alias),
  });

  console.info(`[local-llm] ready (models dir: ${MODELS_DIR})`);
}
