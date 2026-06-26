import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '../services/Logger';
import { WorkspaceService } from '../services/WorkspaceService';
import type { ContextualFile, EditorFile, WorkspaceContext } from '../types';

export interface UseWorkspaceReturn {
  workspaceService: WorkspaceService;
  workspaceContext: WorkspaceContext | null;
  isIndexing: boolean;
  indexingProgress: number;
  error: string | null;

  // Actions
  indexWorkspace: (rootPath: string) => Promise<WorkspaceContext | null>;
  getRelatedFiles: (filePath: string, maxResults?: number) => ContextualFile[];
  searchFiles: (query: string, maxResults?: number) => unknown[];
  getFileContext: (file: EditorFile) => ContextualFile[];
  refreshIndex: () => Promise<void>;
  clearWorkspace: () => void;
}

interface IndexingHandlers {
  setIsIndexing: (value: boolean) => void;
  setError: (value: string | null) => void;
  setIndexingProgress: (value: number | ((prev: number) => number)) => void;
  setWorkspaceContext: (value: WorkspaceContext | null) => void;
  setCurrentRootPath: (value: string | null) => void;
  indexingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

const startProgressSimulation = (
  setIndexingProgress: (value: number | ((prev: number) => number)) => void
): ReturnType<typeof setInterval> => {
  const progressInterval = setInterval(() => {
    setIndexingProgress((prev) => {
      if (prev >= 90) {
        clearInterval(progressInterval);
        return 90;
      }
      return prev + Math.random() * 15;
    });
  }, 200);
  return progressInterval;
};

const runWorkspaceIndexing = async (
  workspaceService: WorkspaceService,
  rootPath: string,
  isIndexing: boolean,
  handlers: IndexingHandlers
): Promise<WorkspaceContext | null> => {
  if (isIndexing) {
    logger.warn('Indexing already in progress');
    return null;
  }

  const {
    setIsIndexing,
    setError,
    setIndexingProgress,
    setWorkspaceContext,
    setCurrentRootPath,
    indexingTimeoutRef,
  } = handlers;

  // Clear any previous reset timeout
  if (indexingTimeoutRef.current) {
    clearTimeout(indexingTimeoutRef.current);
    indexingTimeoutRef.current = undefined;
  }

  let progressInterval: ReturnType<typeof setInterval> | undefined;

  try {
    setIsIndexing(true);
    setError(null);
    setIndexingProgress(0);

    // Simulate progress updates
    progressInterval = startProgressSimulation(setIndexingProgress);

    logger.debug(`Starting workspace indexing for: ${rootPath}`);
    const context = await workspaceService.indexWorkspace(rootPath);

    clearInterval(progressInterval);
    progressInterval = undefined;
    setIndexingProgress(100);
    setWorkspaceContext(context);
    setCurrentRootPath(context?.rootPath || null);

    logger.debug('Workspace indexing completed:', context);

    // Reset progress after a brief delay
    indexingTimeoutRef.current = setTimeout(() => setIndexingProgress(0), 1000);

    return context;
  } catch (err) {
    logger.error('Workspace indexing failed:', err);
    setError(err instanceof Error ? err.message : 'Indexing failed');
    return null;
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    setIsIndexing(false);
  }
};

const computeRelatedFiles = (
  workspaceService: WorkspaceService,
  workspaceContext: WorkspaceContext,
  filePath: string,
  maxResults: number
): ContextualFile[] => {
  const relatedPaths = workspaceService.getRelatedFiles(filePath, maxResults);

  return relatedPaths.map((path) => {
    const analysis = workspaceService.getFileContent(path);
    if (!analysis) {
      return {
        path,
        content: '',
        relevance: 0.1,
        reason: 'File not found',
      };
    }

    // Calculate relevance based on relationship type
    let relevance = 0.5;
    let reason = 'Related file';

    // Check if it's a direct dependency
    const dependencies = workspaceContext.dependencies[filePath] ?? [];
    if (dependencies.includes(path)) {
      relevance = 0.9;
      reason = 'Direct dependency';
    }

    // Check if current file depends on this file
    const reverseDeps = Object.entries(workspaceContext.dependencies)
      .filter(([, deps]) => deps.includes(filePath))
      .map(([depPath]) => depPath);
    if (reverseDeps.includes(path)) {
      relevance = 0.8;
      reason = 'Depends on current file';
    }

    // Check if same directory
    const currentDir = filePath.split('/').slice(0, -1).join('/');
    const fileDir = path.split('/').slice(0, -1).join('/');
    if (currentDir === fileDir) {
      relevance = Math.max(relevance, 0.6);
      reason = reason === 'Related file' ? 'Same directory' : reason;
    }

    // Mock content - in real implementation would read actual file
    const mockContent = `// ${analysis.name}\n// ${analysis.language} file\n// ${analysis.summary}\n\n// Mock content for context`;

    return {
      path,
      content: mockContent,
      relevance,
      reason,
    };
  });
};

const useAutoRefresh = (
  workspaceContext: WorkspaceContext | null,
  currentRootPath: string | null,
  isIndexing: boolean,
  indexWorkspace: (rootPath: string) => Promise<WorkspaceContext | null>,
  debounceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>
): void => {
  // Debounced version of refreshIndex (5 second delay to prevent rapid re-indexing)
  // FIX: Use ref to store workspace context to prevent infinite loop from dependency changes
  const workspaceContextRef = useRef(workspaceContext);
  useEffect(() => {
    workspaceContextRef.current = workspaceContext;
  }, [workspaceContext]);

  const debouncedRefreshIndex = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      debounceTimeoutRef.current = undefined;
      const ctx = workspaceContextRef.current;
      if (ctx && !isIndexing) {
        logger.debug('[useWorkspace] Debounced refresh triggered');
        indexWorkspace(ctx.rootPath).catch((err) => {
          logger.error('[useWorkspace] Debounced refresh failed:', err);
        });
      }
    }, 5000);
  }, [indexWorkspace, isIndexing, debounceTimeoutRef]);

  // Auto-refresh index periodically (every 5 minutes)
  // Uses debounced version to prevent performance issues from rapid refreshes
  // FIX: Use currentRootPath to prevent interval recreation on context changes
  useEffect(() => {
    if (!currentRootPath) {
      return;
    }

    logger.debug('[useWorkspace] Setting up auto-refresh interval (5 minutes)');
    const interval = setInterval(
      () => {
        if (!isIndexing) {
          logger.debug('[useWorkspace] Auto-refresh scheduled (debounced)');
          debouncedRefreshIndex();
        } else {
          logger.debug('[useWorkspace] Skipping auto-refresh - indexing in progress');
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => {
      logger.debug('[useWorkspace] Cleaning up auto-refresh interval');
      clearInterval(interval);
    };
    // FIXED: Use separate state to prevent interval recreation when context object changes
  }, [currentRootPath]);
};

interface WorkspaceQueries {
  getRelatedFiles: (filePath: string, maxResults?: number) => ContextualFile[];
  searchFiles: (query: string, maxResults?: number) => unknown[];
  getFileContext: (file: EditorFile) => ContextualFile[];
}

const useWorkspaceQueries = (
  workspaceService: WorkspaceService,
  workspaceContext: WorkspaceContext | null
): WorkspaceQueries => {
  const getRelatedFiles = useCallback(
    (filePath: string, maxResults = 10): ContextualFile[] => {
      if (!workspaceContext) {
        return [];
      }

      return computeRelatedFiles(workspaceService, workspaceContext, filePath, maxResults);
    },
    [workspaceService, workspaceContext]
  );

  const searchFiles = useCallback(
    (query: string, maxResults = 20) => {
      if (!workspaceContext) {
        return [];
      }

      return workspaceService.searchFiles(query, maxResults);
    },
    [workspaceService, workspaceContext]
  );

  const getFileContext = useCallback(
    (file: EditorFile): ContextualFile[] => {
      if (!workspaceContext) {
        return [];
      }

      const relatedFiles = getRelatedFiles(file.path, 5);

      // Add current file as context
      const currentFileContext: ContextualFile = {
        path: file.path,
        content: file.content,
        relevance: 1.0,
        reason: 'Current file',
      };

      return [currentFileContext, ...relatedFiles];
    },
    [getRelatedFiles, workspaceContext]
  );

  return { getRelatedFiles, searchFiles, getFileContext };
};

const useTimeoutCleanup = (
  indexingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
  debounceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>
): void => {
  // Cleanup any pending reset timeout on unmount
  useEffect(() => {
    return () => {
      if (indexingTimeoutRef.current) {
        clearTimeout(indexingTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [indexingTimeoutRef, debounceTimeoutRef]);
};

interface WorkspaceActions {
  refreshIndex: () => Promise<void>;
  clearWorkspace: () => void;
}

interface WorkspaceActionDeps {
  setWorkspaceContext: (value: WorkspaceContext | null) => void;
  setCurrentRootPath: (value: string | null) => void;
  setError: (value: string | null) => void;
  setIndexingProgress: (value: number) => void;
}

const useWorkspaceActions = (
  workspaceContext: WorkspaceContext | null,
  indexWorkspace: (rootPath: string) => Promise<WorkspaceContext | null>,
  deps: WorkspaceActionDeps
): WorkspaceActions => {
  const { setWorkspaceContext, setCurrentRootPath, setError, setIndexingProgress } = deps;

  const refreshIndex = useCallback(async () => {
    if (!workspaceContext) {
      return;
    }

    await indexWorkspace(workspaceContext.rootPath);
  }, [indexWorkspace, workspaceContext]);

  const clearWorkspace = useCallback(() => {
    setWorkspaceContext(null);
    setCurrentRootPath(null);
    setError(null);
    setIndexingProgress(0);
  }, [setWorkspaceContext, setCurrentRootPath, setError, setIndexingProgress]);

  return { refreshIndex, clearWorkspace };
};

export const useWorkspace = (): UseWorkspaceReturn => {
  const [workspaceService] = useState(() => new WorkspaceService());
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);
  const [currentRootPath, setCurrentRootPath] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const indexingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const indexWorkspace = useCallback(
    async (rootPath: string): Promise<WorkspaceContext | null> =>
      runWorkspaceIndexing(workspaceService, rootPath, isIndexing, {
        setIsIndexing,
        setError,
        setIndexingProgress,
        setWorkspaceContext,
        setCurrentRootPath,
        indexingTimeoutRef,
      }),
    [workspaceService, isIndexing]
  );

  useTimeoutCleanup(indexingTimeoutRef, debounceTimeoutRef);

  const { getRelatedFiles, searchFiles, getFileContext } = useWorkspaceQueries(
    workspaceService,
    workspaceContext
  );

  useAutoRefresh(workspaceContext, currentRootPath, isIndexing, indexWorkspace, debounceTimeoutRef);

  const { refreshIndex, clearWorkspace } = useWorkspaceActions(workspaceContext, indexWorkspace, {
    setWorkspaceContext,
    setCurrentRootPath,
    setError,
    setIndexingProgress,
  });

  return {
    workspaceService,
    workspaceContext,
    isIndexing,
    indexingProgress,
    error,

    // Actions
    indexWorkspace,
    getRelatedFiles,
    searchFiles,
    getFileContext,
    refreshIndex,
    clearWorkspace,
  };
};

export default useWorkspace;
