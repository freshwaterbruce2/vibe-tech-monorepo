/**
 * Open-folder dialog orchestration (native picker → fallback InputDialog).
 */

import { logger } from '../services/Logger';

export type OpenFolderDialogDeps = {
  handleOpenFolder: (folderPath: string) => Promise<void>;
  showError: (title: string, message: string) => void;
  setFolderPathDialogOpen: (open: boolean) => void;
};

/**
 * Prefer native Electron/Tauri folder picker; fall back to browser directory
 * picker or manual path entry dialog.
 */
export async function runOpenFolderDialog(deps: OpenFolderDialogDeps): Promise<void> {
  const { handleOpenFolder, showError, setFolderPathDialogOpen } = deps;

  try {
    if (window.electron?.dialog) {
      // Native folder picker — the Tauri shim (tauriShim.ts) and the Electron
      // preload both expose dialog.openFolder mapped to the platform dialog.
      const result = await window.electron.dialog.openFolder({});
      if (!result.canceled && result.filePaths?.length > 0 && result.filePaths[0]) {
        const normalizedPath = result.filePaths[0].replace(/\\/g, '/');
        await handleOpenFolder(normalizedPath);
      }
      return;
    }

    if ('showDirectoryPicker' in window) {
      const directoryPicker = globalThis as typeof globalThis & {
        showDirectoryPicker?: () => Promise<{ path?: string; name: string }>;
      };
      const dirHandle = await directoryPicker.showDirectoryPicker?.();
      if (!dirHandle) {
        throw new Error('Directory picker not available');
      }
      const folderPath = dirHandle.path ?? dirHandle.name;
      await handleOpenFolder(folderPath);
      return;
    }

    // Fallback: use InputDialog for manual path entry
    setFolderPathDialogOpen(true);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    logger.error('Native folder picker failed, falling back to manual entry:', error);
    showError(
      'Open Folder Failed',
      `Unable to open the selected folder: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    // Native dialog unavailable or crashed — manual path entry still works.
    setFolderPathDialogOpen(true);
  }
}
