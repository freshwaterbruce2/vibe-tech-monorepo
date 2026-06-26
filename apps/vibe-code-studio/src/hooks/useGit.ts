import { useCallback, useEffect, useState } from 'react';

import type {
  GitBranch,
  GitCommit,
  GitRemote,
  GitStatus} from '../services/GitService';
import {
  GitService
} from '../services/GitService';
import { logger } from '../services/Logger';

interface UseGitReturn {
  // State
  isGitRepo: boolean;
  status: GitStatus | null;
  commits: GitCommit[];
  branches: GitBranch[];
  remotes: GitRemote[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  init: () => Promise<void>;
  add: (files: string | string[]) => Promise<void>;
  addAll: () => Promise<void>;
  reset: (files?: string | string[]) => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: (remote?: string, branch?: string) => Promise<void>;
  pull: (remote?: string, branch?: string) => Promise<void>;
  fetch: (remote?: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  checkout: (branch: string) => Promise<void>;
  stash: (message?: string) => Promise<void>;
  stashPop: () => Promise<void>;
  discardChanges: (filePath: string) => Promise<void>;
}

interface GitState {
  isGitRepo: boolean;
  status: GitStatus | null;
  commits: GitCommit[];
  branches: GitBranch[];
  remotes: GitRemote[];
  isLoading: boolean;
  error: string | null;
}

interface GitStateSetters {
  setIsGitRepo: React.Dispatch<React.SetStateAction<boolean>>;
  setStatus: React.Dispatch<React.SetStateAction<GitStatus | null>>;
  setCommits: React.Dispatch<React.SetStateAction<GitCommit[]>>;
  setBranches: React.Dispatch<React.SetStateAction<GitBranch[]>>;
  setRemotes: React.Dispatch<React.SetStateAction<GitRemote[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

interface GitRefreshers {
  checkGitRepo: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  refreshCommits: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshRemotes: () => Promise<void>;
  refresh: () => Promise<void>;
}

function useGitState(): GitState & GitStateSetters {
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [remotes, setRemotes] = useState<GitRemote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return {
    isGitRepo,
    status,
    commits,
    branches,
    remotes,
    isLoading,
    error,
    setIsGitRepo,
    setStatus,
    setCommits,
    setBranches,
    setRemotes,
    setIsLoading,
    setError,
  };
}

/**
 * Run a refresh operation guarded by isGitRepo, logging (and optionally surfacing) errors.
 */
async function runGuardedRefresh(
  isGitRepo: boolean,
  load: () => Promise<void>,
  errorLabel: string,
  setError?: SetError
): Promise<void> {
  if (!isGitRepo) {
    return;
  }

  try {
    await load();
  } catch (err) {
    if (setError) {
      setError(err instanceof Error ? err.message : String(err));
    }
    logger.error(errorLabel, err);
  }
}

type GitDataRefreshers = Pick<
  GitRefreshers,
  'refreshStatus' | 'refreshCommits' | 'refreshBranches' | 'refreshRemotes'
>;

function useGitDataRefreshers(
  gitService: GitService,
  isGitRepo: boolean,
  setters: GitStateSetters
): GitDataRefreshers {
  const { setStatus, setCommits, setBranches, setRemotes, setError } = setters;

  const refreshStatus = useCallback(
    () =>
      runGuardedRefresh(
        isGitRepo,
        async () => setStatus(await gitService.getStatus()),
        'Error refreshing git status:',
        setError
      ),
    [gitService, isGitRepo, setStatus, setError]
  );

  const refreshCommits = useCallback(
    () =>
      runGuardedRefresh(
        isGitRepo,
        async () => setCommits(await gitService.getLog(20)),
        'Error refreshing commits:'
      ),
    [gitService, isGitRepo, setCommits]
  );

  const refreshBranches = useCallback(
    () =>
      runGuardedRefresh(
        isGitRepo,
        async () => setBranches(await gitService.getBranches()),
        'Error refreshing branches:'
      ),
    [gitService, isGitRepo, setBranches]
  );

  const refreshRemotes = useCallback(
    () =>
      runGuardedRefresh(
        isGitRepo,
        async () => setRemotes(await gitService.getRemotes()),
        'Error refreshing remotes:'
      ),
    [gitService, isGitRepo, setRemotes]
  );

  return { refreshStatus, refreshCommits, refreshBranches, refreshRemotes };
}

function useGitRefreshers(
  gitService: GitService,
  isGitRepo: boolean,
  setters: GitStateSetters
): GitRefreshers {
  const { setIsGitRepo, setIsLoading, setError } = setters;

  const checkGitRepo = useCallback(async () => {
    try {
      const isRepo = await gitService.isGitRepository();
      setIsGitRepo(isRepo);
      return isRepo;
    } catch (err) {
      logger.error('Error checking git repository:', err);
      return false;
    }
  }, [gitService, setIsGitRepo]);

  const { refreshStatus, refreshCommits, refreshBranches, refreshRemotes } = useGitDataRefreshers(
    gitService,
    isGitRepo,
    setters
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const isRepo = await checkGitRepo();
      if (isRepo) {
        await Promise.all([refreshStatus(), refreshCommits(), refreshBranches(), refreshRemotes()]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [
    checkGitRepo,
    refreshStatus,
    refreshCommits,
    refreshBranches,
    refreshRemotes,
    setIsLoading,
    setError,
  ]);

  return { checkGitRepo, refreshStatus, refreshCommits, refreshBranches, refreshRemotes, refresh };
}

type GitActions = Omit<
  UseGitReturn,
  'isGitRepo' | 'status' | 'commits' | 'branches' | 'remotes' | 'isLoading' | 'error' | 'refresh'
>;

type SetError = React.Dispatch<React.SetStateAction<string | null>>;

/**
 * Run a git operation followed by a refresh, surfacing errors via setError and rethrowing.
 */
async function runGitOp(
  setError: SetError,
  operation: () => Promise<unknown>,
  afterRefresh: () => Promise<void>
): Promise<void> {
  try {
    await operation();
    await afterRefresh();
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
    throw err;
  }
}

type GitStagingActions = Pick<
  GitActions,
  'init' | 'add' | 'addAll' | 'reset' | 'commit' | 'discardChanges'
>;

function useGitStagingActions(
  gitService: GitService,
  refreshers: GitRefreshers,
  setIsGitRepo: React.Dispatch<React.SetStateAction<boolean>>,
  setError: SetError
): GitStagingActions {
  const { refresh, refreshStatus, refreshCommits } = refreshers;

  const init = useCallback(
    () =>
      runGitOp(
        setError,
        async () => {
          await gitService.init();
          setIsGitRepo(true);
        },
        refresh
      ),
    [gitService, refresh, setIsGitRepo, setError]
  );

  const add = useCallback(
    (files: string | string[]) =>
      runGitOp(setError, () => gitService.add(files), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  const addAll = useCallback(
    () => runGitOp(setError, () => gitService.addAll(), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  const reset = useCallback(
    (files?: string | string[]) =>
      runGitOp(setError, () => gitService.reset(files), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  const commit = useCallback(
    (message: string) =>
      runGitOp(setError, () => gitService.commit(message), async () => {
        await Promise.all([refreshStatus(), refreshCommits()]);
      }),
    [gitService, refreshStatus, refreshCommits, setError]
  );

  const discardChanges = useCallback(
    (filePath: string) =>
      runGitOp(setError, () => gitService.discardChanges(filePath), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  return { init, add, addAll, reset, commit, discardChanges };
}

type GitRemoteActions = Pick<
  GitActions,
  'push' | 'pull' | 'fetch' | 'createBranch' | 'checkout' | 'stash' | 'stashPop'
>;

function useGitRemoteActions(
  gitService: GitService,
  refreshers: GitRefreshers,
  setError: SetError
): GitRemoteActions {
  const { refresh, refreshStatus, refreshBranches } = refreshers;

  const push = useCallback(
    (remote: string = 'origin', branch?: string) =>
      runGitOp(setError, () => gitService.push(remote, branch), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  const pull = useCallback(
    (remote: string = 'origin', branch?: string) =>
      runGitOp(setError, () => gitService.pull(remote, branch), refresh),
    [gitService, refresh, setError]
  );

  const fetch = useCallback(
    (remote: string = 'origin') =>
      runGitOp(setError, () => gitService.fetch(remote), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  const createBranch = useCallback(
    (name: string) =>
      runGitOp(setError, () => gitService.createBranch(name), refreshBranches),
    [gitService, refreshBranches, setError]
  );

  const checkout = useCallback(
    (branch: string) =>
      runGitOp(setError, () => gitService.checkout(branch), refresh),
    [gitService, refresh, setError]
  );

  const stash = useCallback(
    (message?: string) =>
      runGitOp(setError, () => gitService.stash(message), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  const stashPop = useCallback(
    () => runGitOp(setError, () => gitService.stashPop(), refreshStatus),
    [gitService, refreshStatus, setError]
  );

  return { push, pull, fetch, createBranch, checkout, stash, stashPop };
}

function useGitAutoLoad(
  isGitRepo: boolean,
  refresh: () => Promise<void>,
  refreshStatus: () => Promise<void>
): void {
  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh on file system changes (optional)
  useEffect(() => {
    if (!isGitRepo) {
      return;
    }

    // Refresh status every 5 seconds
    const interval = setInterval(refreshStatus, 5000);

    return () => clearInterval(interval);
  }, [isGitRepo, refreshStatus]);
}

export function useGit(workingDirectory?: string): UseGitReturn {
  const [gitService] = useState(() => new GitService(workingDirectory ?? '/'));
  const gitState = useGitState();
  const { isGitRepo, status, commits, branches, remotes, isLoading, error } = gitState;

  const refreshers = useGitRefreshers(gitService, isGitRepo, gitState);
  const stagingActions = useGitStagingActions(
    gitService,
    refreshers,
    gitState.setIsGitRepo,
    gitState.setError
  );
  const remoteActions = useGitRemoteActions(gitService, refreshers, gitState.setError);

  useGitAutoLoad(isGitRepo, refreshers.refresh, refreshers.refreshStatus);

  return {
    // State
    isGitRepo,
    status,
    commits,
    branches,
    remotes,
    isLoading,
    error,

    // Actions
    refresh: refreshers.refresh,
    ...stagingActions,
    ...remoteActions,
  };
}

export default useGit;
