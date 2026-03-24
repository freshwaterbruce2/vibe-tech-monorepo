import { CONFIG } from '../config.js';
import { runCommand } from './process-tools.js';

const GIT = 'git -c core.pager=cat';

export function gitStatus(): string {
  return runCommand(`${GIT} status --porcelain`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.GIT_TIMEOUT_MS,
  }).stdout;
}

export function gitChangedFiles(baseBranch = 'main'): string[] {
  const result = runCommand(`${GIT} diff --name-only --diff-filter=ACMRT ${baseBranch}...HEAD`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.GIT_TIMEOUT_MS,
  });

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function gitDiff(baseBranch = 'main', paths: string[] = []): string {
  const pathspec = paths.length > 0 ? ` -- ${paths.map((path) => `"${path}"`).join(' ')}` : '';
  return runCommand(`${GIT} diff --no-color ${baseBranch}...HEAD${pathspec}`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.GIT_TIMEOUT_MS,
  }).stdout;
}

export function gitWorktreeAdd(path: string, branchName: string): void {
  const result = runCommand(`${GIT} worktree add "${path}" -b ${branchName}`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.GIT_TIMEOUT_MS,
  });

  if (!result.success) {
    throw new Error(result.stderr || `Failed to create worktree ${path}`);
  }
}

export function gitWorktreeRemove(path: string): void {
  const result = runCommand(`${GIT} worktree remove "${path}" --force`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.GIT_TIMEOUT_MS,
  });

  if (!result.success) {
    throw new Error(result.stderr || `Failed to remove worktree ${path}`);
  }
}

export function gitBranchDelete(branchName: string): void {
  const result = runCommand(`${GIT} branch -D ${branchName}`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.GIT_TIMEOUT_MS,
  });

  if (!result.success) {
    throw new Error(result.stderr || `Failed to delete branch ${branchName}`);
  }
}
