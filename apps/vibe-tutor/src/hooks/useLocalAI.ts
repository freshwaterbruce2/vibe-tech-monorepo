import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadModel,
  getModelState,
  type LocalAiBackend,
  type LocalAiStatus,
} from '../services/localAiService';
import { logger } from '../utils/logger';

/**
 * Manages the on-device AI model lifecycle for the active backend
 * (Chrome built-in Gemini Nano, or @electron/llm on desktop).
 *
 * Status meanings:
 * - 'available':    model is on disk, tools can run immediately
 * - 'downloadable': supported hardware, model needs a one-time download
 *                   (call requestDownload from a click handler -- Chrome
 *                   requires user activation to start the download)
 * - 'downloading':  download in flight; `progress` is 0..1
 * - 'unavailable':  unsupported environment (Android WebView, old browser,
 *                   weak hardware) -- hide or disable local AI UI
 */
export interface UseLocalAIResult {
  backend: LocalAiBackend;
  status: LocalAiStatus;
  /** Download progress, 0..1. Only meaningful while status is 'downloading'. */
  progress: number;
  error: string | null;
  requestDownload: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLocalAI(): UseLocalAIResult {
  const [backend, setBackend] = useState<LocalAiBackend>('none');
  const [status, setStatus] = useState<LocalAiStatus>('unavailable');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const state = await getModelState();
      if (!mountedRef.current) return;
      setBackend(state.backend);
      setStatus(state.status);
      setProgress(state.progress);
    } catch (err) {
      logger.warn('Local AI state refresh failed:', err);
      if (!mountedRef.current) return;
      setBackend('none');
      setStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestDownload = useCallback(async () => {
    setError(null);
    setStatus('downloading');
    setProgress(0);

    const ok = await downloadModel((loaded) => {
      if (mountedRef.current) {
        setProgress(loaded);
      }
    });

    if (!mountedRef.current) return;

    if (!ok) {
      setError('The model download failed. Check your connection and try again.');
    }
    await refresh();
  }, [refresh]);

  return { backend, status, progress, error, requestDownload, refresh };
}
