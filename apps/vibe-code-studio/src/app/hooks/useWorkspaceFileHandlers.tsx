import { useCallback } from 'react';

import { logger } from '../../services/Logger';
import type { FileSystemService } from '../../services/FileSystemService';
import type { EditorFile } from '../../types';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function remapOpenPath(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) {
    return newPath;
  }

  const prefix = `${oldPath}/`;
  if (path.startsWith(prefix)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }

  return path;
}

export interface WorkspaceFileHandlersOptions {
  fileSystemService: FileSystemService;
  currentFile: EditorFile | null;
  openFiles: EditorFile[];
  setCurrentFile: (file: EditorFile | null) => void;
  setOpenFiles: (files: EditorFile[]) => void;
  setWorkspaceFolder: (folder: string | null) => void;
  handleOpenFile: (filePath: string) => Promise<void>;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

/**
 * Workspace file-system handlers (create/rename/delete/save/close) extracted
 * from App.tsx. Co-located as a hook so the App component stays under the
 * file-size cap; behaviour is identical to the original inline callbacks.
 */
export function useWorkspaceFileHandlers(options: WorkspaceFileHandlersOptions) {
  const {
    fileSystemService,
    currentFile,
    openFiles,
    setCurrentFile,
    setOpenFiles,
    setWorkspaceFolder,
    handleOpenFile,
    showSuccess,
    showError,
    showWarning,
  } = options;

  // Helper function for creating new (in-memory) files
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

  const handleRenameWorkspacePath = useCallback(async (
    oldPath: string,
    newPath: string,
  ): Promise<void> => {
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
        `${normalizedOldPath.split('/').pop()} → ${normalizedNewPath.split('/').pop()}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Rename Failed', `Unable to rename item: ${errorMessage}`);
      throw error;
    }
  }, [
    fileSystemService, currentFile, openFiles,
    setCurrentFile, setOpenFiles, showSuccess, showError,
  ]);

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
  }, [
    fileSystemService, currentFile, openFiles,
    setCurrentFile, setOpenFiles, showSuccess, showError,
  ]);

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

  return {
    handleCreateFile,
    handleCreateWorkspaceFile,
    handleCreateWorkspaceFolder,
    handleRenameWorkspacePath,
    handleDeleteFile,
    handleSaveAll,
    handleCloseFolder,
  };
}
