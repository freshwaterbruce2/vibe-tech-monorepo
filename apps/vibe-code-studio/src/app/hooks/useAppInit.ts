/**
 * One-time app init: telemetry, demo workspace, auto-open-folder listener.
 */

import { useEffect, useRef } from 'react';

import { logger } from '../../services/Logger';
import { telemetry } from '../../services/TelemetryService';

type OpenHandlerRef = {
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
};

type ElectronEventHandler = (arg: string) => void;
interface ElectronApi {
  on?: (event: string, handler: ElectronEventHandler) => void;
  removeListener?: (event: string, handler: ElectronEventHandler) => void;
}

/** Track telemetry and load the demo workspace when not running under Electron. */
function runAppInitTasks(handlersRef: { current: OpenHandlerRef }): void {
  telemetry.trackEvent('app_initialized', {
    version: import.meta.env['VITE_APP_VERSION'],
    platform: navigator.platform,
    language: navigator.language,
  });

  // Demo mode: load the in-memory demo workspace ONLY in a plain browser (web
  // dev preview). On the desktop build (Tauri, or Electron) the user opens a
  // real folder — auto-loading demo:// there would show fabricated files.
  const win =
    typeof window === 'undefined'
      ? undefined
      : (window as unknown as {
          __TAURI_INTERNALS__?: unknown;
          __ELECTRON__?: unknown;
          electron?: { isElectron?: boolean };
        });
  const isDesktop =
    !!win && ('__TAURI_INTERNALS__' in win || !!win.__ELECTRON__ || !!win.electron?.isElectron);
  if (!isDesktop) {
    const demoPath = 'demo://workspace';
    handlersRef.current.handleOpenFolder(demoPath);
    setTimeout(() => {
      handlersRef.current.handleOpenFile('demo://workspace/index.js');
    }, 1500);
  }

  logger.debug('App initialization complete');
}

/**
 * Register the auto-open-folder Electron listener once. Returns a cleanup
 * function, or undefined when Electron is unavailable / already registered.
 */
function registerAutoOpenListener(
  handlersRef: { current: OpenHandlerRef },
  listenerRegisteredRef: { current: boolean }
): (() => void) | undefined {
  const electron = (globalThis as unknown as Record<string, unknown>).electron as
    | ElectronApi
    | undefined;
  if (!electron?.on || listenerRegisteredRef.current) {
    if (!electron?.on) {
      logger.warn('[App] electron.on not available - auto-open disabled');
    }
    return undefined;
  }

  logger.info('[App] Registering auto-open-folder listener (once)');
  listenerRegisteredRef.current = true;

  const handleAutoOpen = (folderPath: string) => {
    logger.info('[App] Received auto-open-folder event:', folderPath);
    if (folderPath && typeof folderPath === 'string') {
      handlersRef.current.handleOpenFolder(folderPath).catch((err: Error) => {
        logger.error('[App] Failed to open folder:', err);
      });
    }
  };

  electron.on('auto-open-folder', handleAutoOpen);

  return () => {
    logger.info('[App] Removing auto-open-folder listener');
    listenerRegisteredRef.current = false;
    electron.removeListener?.('auto-open-folder', handleAutoOpen);
  };
}

/**
 * Hook for app initialization effect (telemetry, updates, demo mode)
 */
export function useAppInit(props: {
  showWarning: (title: string, message?: string) => void;
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
}) {
  const { showWarning, handleOpenFolder, handleOpenFile } = props;

  const handlersRef = useRef({ handleOpenFolder, handleOpenFile });
  useEffect(() => {
    handlersRef.current = { handleOpenFolder, handleOpenFile };
  });

  const listenerRegisteredRef = useRef(false);

  useEffect(() => {
    runAppInitTasks(handlersRef);
  }, [showWarning]);

  useEffect(() => {
    return registerAutoOpenListener(handlersRef, listenerRegisteredRef);
  }, []);
}
