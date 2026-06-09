/**
 * useSearchHandlers - Workspace file search and replace handlers
 */

import { useCallback, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { SearchScope } from '../../components/GlobalSearch/types';
import { logger } from '../../services/Logger';
import { SearchService } from '../../services/SearchService';
import type { SearchOptions } from '../../services/SearchService';
import type { FileSystemService } from '../../services/FileSystemService';
import type { EditorFile } from '../../types';
import type { editor as MonacoEditorNS } from 'monaco-editor';

export interface UseSearchHandlersProps {
  fileSystemService: FileSystemService;
  currentFile: EditorFile | null;
  workspaceFolder: string | null;
  editorRef: MutableRefObject<MonacoEditorNS.IStandaloneCodeEditor | null>;

  handleFileChange: (content: string) => void;
  handleOpenFileRaw: (filePath: string) => Promise<void>;

  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

export function useSearchHandlers(props: UseSearchHandlersProps) {
  const {
    fileSystemService,
    currentFile,
    workspaceFolder,
    editorRef,
    handleFileChange,
    handleOpenFileRaw,
    showSuccess,
    showError,
    showWarning,
  } = props;

  const searchService = useMemo(() => new SearchService(fileSystemService), [fileSystemService]);
  const workspaceFileCacheRef = useRef<{
    rootPath: string;
    files: string[];
    scannedAt: number;
  } | null>(null);

  const DIRECTORY_EXCLUDE_SET = useMemo(
    () =>
      new Set([
        'node_modules',
        '.git',
        'dist',
        'dist-electron',
        'build',
        'coverage',
        'out',
        '_backups',
        '.nx',
        '.claude',
        '.deepcode',
      ]),
    []
  );

  const collectWorkspaceFilesRecursively = useCallback(
    async (rootPath: string): Promise<string[]> => {
      const now = Date.now();
      const cache = workspaceFileCacheRef.current;
      if (cache?.rootPath === rootPath && now - cache.scannedAt < 30_000) {
        return cache.files;
      }

      const discoveredFiles: string[] = [];
      const pendingDirectories: string[] = [rootPath];
      const visitedDirectories = new Set<string>();

      while (pendingDirectories.length > 0) {
        const directory = pendingDirectories.pop();
        if (!directory) {
          continue;
        }

        const normalizedDirectory = directory.replace(/\\/g, '/').toLowerCase();
        if (visitedDirectories.has(normalizedDirectory)) {
          continue;
        }
        visitedDirectories.add(normalizedDirectory);

        let entries: Array<{ name: string; path: string; type: 'file' | 'directory' }> = [];
        try {
          entries = await fileSystemService.listDirectory(directory);
        } catch (error) {
          logger.warn(`[Search] Skipping unreadable directory: ${directory}`, error);
          continue;
        }

        for (const entry of entries) {
          if (entry.type === 'directory') {
            if (DIRECTORY_EXCLUDE_SET.has(entry.name.toLowerCase())) {
              continue;
            }
            pendingDirectories.push(entry.path);
            continue;
          }

          discoveredFiles.push(entry.path.replace(/\\/g, '/'));
        }
      }

      workspaceFileCacheRef.current = {
        rootPath,
        files: discoveredFiles,
        scannedAt: Date.now(),
      };

      return discoveredFiles;
    },
    [DIRECTORY_EXCLUDE_SET, fileSystemService]
  );

  // Handle file open from search
  const handleOpenFileFromSearch = useCallback((file: string, line?: number, column?: number) => {
    handleOpenFileRaw(file);
    if (line && editorRef.current) {
      const targetColumn = column ?? 1;
      setTimeout(() => {
        try {
          editorRef.current?.revealPositionInCenter({ lineNumber: line, column: targetColumn });
          editorRef.current?.setPosition({ lineNumber: line, column: targetColumn });
          editorRef.current?.focus();
        } catch (err) {
          logger.warn('Failed to navigate to position', err);
        }
      }, 50);
    }
  }, [handleOpenFileRaw]);

  // Handle replace in file
  const handleReplaceInFile = useCallback(async (
    file: string,
    searchText: string,
    replaceText: string,
    options: SearchOptions
  ) => {
    try {
      const result = await searchService.replaceInFile(
        file,
        (searchService as unknown as { createSearchPattern: (s: string, o: SearchOptions) => RegExp }).createSearchPattern(searchText, options),
        replaceText,
        options
      );

      if (result.success && result.replacements > 0) {
        showSuccess('Replace Complete', `Replaced ${result.replacements} occurrences in ${file}`);

        if (currentFile?.path === file) {
          const content = await fileSystemService.readFile(file);
          if (content !== undefined) {
            handleFileChange(content);
          }
        }
      }
    } catch (error) {
      showError('Replace Failed', `Failed to replace in ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentFile, fileSystemService, handleFileChange, showSuccess, showError, searchService]);

  // Handle search in files
  const handleSearchInFiles = useCallback(async (
    searchText: string,
    files: string[],
    options: SearchOptions,
    scope: SearchScope = 'open-files'
  ) => {
    try {
      let filesToSearch = files;

      if (scope === 'workspace-recursive') {
        if (!workspaceFolder) {
          showWarning('Workspace Search Unavailable', 'Open a workspace folder to search recursively.');
          return {};
        }
        filesToSearch = await collectWorkspaceFilesRecursively(workspaceFolder);
      }

      if (filesToSearch.length === 0) {
        return {};
      }

      return await searchService.searchInFiles(searchText, filesToSearch, options);
    } catch (error) {
      logger.error('[Search] Failed to search in files:', error);
      showError('Search Failed', error instanceof Error ? error.message : 'Unknown error');
      return {};
    }
  }, [
    collectWorkspaceFilesRecursively,
    searchService,
    showError,
    showWarning,
    workspaceFolder,
  ]);

  return {
    handleOpenFileFromSearch,
    handleReplaceInFile,
    handleSearchInFiles,
  };
}
