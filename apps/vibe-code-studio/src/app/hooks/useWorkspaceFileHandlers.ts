/**
 * useWorkspaceFileHandlers - Workspace and file-operation callbacks for App.tsx.
 *
 * Follows the same signature pattern as useAppHandlers: receives a typed props
 * object with the services/state/setters it needs, returns the handler functions.
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { FileSystemService } from '../../services/FileSystemService';
import type { EditorFile } from '../../types';
import { logger } from '../../services/Logger';
import { normalizePath, remapOpenPath } from '../appPathUtils';

export interface UseWorkspaceFileHandlersProps {
  // Services
  fileSystemService: FileSystemService;

  // File state
  currentFile: EditorFile | null;
  openFiles: EditorFile[];

  // State setters
  setCurrentFile: (file: EditorFile | null) => void;
  setOpenFiles: Dispatch<SetStateAction<EditorFile[]>>;
  setWorkspaceFolder: (folder: string | null) => void;
  setFolderPathDialogOpen: Dispatch<SetStateAction<boolean>>;
  setNewFileDialogOpen: Dispatch<SetStateAction<boolean>>;

  // Notification handlers
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;

  // Dependent handlers provided by App.tsx
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
}

export function useWorkspaceFileHandlers(props: UseWorkspaceFileHandlersProps) {
  const {
    fileSystemService,
    currentFile,
    openFiles,
    setCurrentFile,
    setOpenFiles,
    setWorkspaceFolder,
    setFolderPathDialogOpen,
    setNewFileDialogOpen,
    showSuccess,
    showError,
    showWarning,
    handleOpenFolder,
    handleOpenFile,
  } = props;

  // Handle workspace opening with file picker
  const handleOpenFolderDialog = useCallback(async () => {
    try {
      if (window.electron?.isElectron) {
        const result = await window.electron.dialog.openFolder({});
        if (!result.canceled && result.filePaths?.length > 0 && result.filePaths[0]) {
          const normalizedPath = result.filePaths[0].replace(/\\/g, '/');
          await handleOpenFolder(normalizedPath);
        }
      } else if ('showDirectoryPicker' in window) {
        const directoryPicker = globalThis as typeof globalThis & {
          showDirectoryPicker?: () => Promise<{ path?: string; name: string }>;
        };
        const dirHandle = await directoryPicker.showDirectoryPicker?.();
        if (!dirHandle) {
          throw new Error('Directory picker not available');
        }
        const folderPath = dirHandle.path ?? dirHandle.name;
        await handleOpenFolder(folderPath);
      } else {
        // Fallback: use InputDialog for manual path entry
        setFolderPathDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      showError('Open Folder Failed', `Unable to open the selected folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [handleOpenFolder, showError, setFolderPathDialogOpen]);

  // Helper function for creating new files
  const handleCreateFile = useCallback((name: string) => {
    const getLanguageFromExtension = (filePath: string): string => {
      const ext = filePath.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php',
        rb: 'ruby', go: 'go', rs: 'rust', html: 'html', css: 'css', scss: 'scss',
        json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', md: 'markdown',
        sh: 'shell', sql: 'sql',
      };
      return languageMap[ext ?? ''] ?? 'plaintext';
    };

    const newFile: EditorFile = {
      id: name,
      name,
      path: name,
      content: '',
      language: getLanguageFromExtension(name),
      isModified: false,
    };
    setCurrentFile(newFile);
  }, [setCurrentFile]);

  const handleCreateWorkspaceFile = useCallback(async (filePath: string): Promise<void> => {
    const normalizedPath = normalizePath(filePath);

    try {
      await fileSystemService.createFile(normalizedPath, '');
      await handleOpenFile(normalizedPath);
      showSuccess('File Created', `Created ${normalizedPath.split('/').pop()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Create File Failed', `Unable to create file: ${errorMessage}`);
      throw error;
    }
  }, [fileSystemService, handleOpenFile, showSuccess, showError]);

  const handleCreateWorkspaceFolder = useCallback(async (folderPath: string): Promise<void> => {
    const normalizedPath = normalizePath(folderPath);

    try {
      await fileSystemService.createDirectory(normalizedPath);
      showSuccess('Folder Created', `Created ${normalizedPath.split('/').pop()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Create Folder Failed', `Unable to create folder: ${errorMessage}`);
      throw error;
    }
  }, [fileSystemService, showSuccess, showError]);

  const handleRenameWorkspacePath = useCallback(async (oldPath: string, newPath: string): Promise<void> => {
    const normalizedOldPath = normalizePath(oldPath);
    const normalizedNewPath = normalizePath(newPath);

    try {
      await fileSystemService.rename(normalizedOldPath, normalizedNewPath);

      setOpenFiles(
        openFiles.map((file) => {
          const remappedPath = remapOpenPath(file.path, normalizedOldPath, normalizedNewPath);
          if (remappedPath === file.path) {
            return file;
          }

          return {
            ...file,
            id: remappedPath,
            path: remappedPath,
            name: remappedPath.split('/').pop() ?? remappedPath,
          };
        })
      );

      if (currentFile) {
        const remappedCurrentPath = remapOpenPath(
          currentFile.path,
          normalizedOldPath,
          normalizedNewPath
        );
        if (remappedCurrentPath !== currentFile.path) {
          setCurrentFile({
            ...currentFile,
            id: remappedCurrentPath,
            path: remappedCurrentPath,
            name: remappedCurrentPath.split('/').pop() ?? remappedCurrentPath,
          });
        }
      }

      showSuccess(
        'Item Renamed',
        `${normalizedOldPath.split('/').pop()} -> ${normalizedNewPath.split('/').pop()}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Rename Failed', `Unable to rename item: ${errorMessage}`);
      throw error;
    }
  }, [fileSystemService, currentFile, openFiles, setCurrentFile, setOpenFiles, showSuccess, showError]);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (filePath: string): Promise<void> => {
    const normalizedPath = normalizePath(filePath);
    const removedPrefix = `${normalizedPath}/`;

    try {
      await fileSystemService.deleteFile(normalizedPath);
      if (currentFile?.path === normalizedPath || currentFile?.path.startsWith(removedPrefix)) {
        setCurrentFile(null);
      }
      const updatedOpenFiles = openFiles.filter(
        file => file.path !== normalizedPath && !file.path.startsWith(removedPrefix)
      );
      setOpenFiles(updatedOpenFiles);
      showSuccess('File Deleted', `Successfully deleted ${normalizedPath.split('/').pop()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Delete Failed', `Unable to delete file: ${errorMessage}`);
      throw error;
    }
  }, [fileSystemService, currentFile, openFiles, setCurrentFile, setOpenFiles, showSuccess, showError]);

  // Handle saving all open files
  const handleSaveAll = useCallback(async () => {
    try {
      const modifiedFiles = openFiles.filter(f => f.isModified);
      await Promise.all(modifiedFiles.map(f => fileSystemService.writeFile(f.path, f.content)));
      const savedCount = modifiedFiles.length;
      if (savedCount > 0) {
        showSuccess('Files Saved', `Successfully saved ${savedCount} file(s)`);
      } else {
        showWarning('No Changes', 'No files needed to be saved');
      }
    } catch (error: unknown) {
      logger.error('Save all failed', { error });
      showError('Save Failed', 'Unable to save all files');
    }
  }, [openFiles, fileSystemService, showSuccess, showWarning, showError]);

  // Handle closing current workspace
  const handleCloseFolder = useCallback(() => {
    setWorkspaceFolder(null);
    setCurrentFile(null);
    setOpenFiles([]);
    showSuccess('Workspace Closed', 'Workspace has been closed');
  }, [setWorkspaceFolder, setCurrentFile, setOpenFiles, showSuccess]);

  // Handle creating new file (opens dialog)
  const handleNewFile = useCallback(() => {
    setNewFileDialogOpen(true);
  }, [setNewFileDialogOpen]);

  return {
    handleOpenFolderDialog,
    handleCreateFile,
    handleCreateWorkspaceFile,
    handleCreateWorkspaceFolder,
    handleRenameWorkspacePath,
    handleDeleteFile,
    handleSaveAll,
    handleCloseFolder,
    handleNewFile,
  };
}
