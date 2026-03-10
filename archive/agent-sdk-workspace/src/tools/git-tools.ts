import { execSync } from 'child_process';
import { CONFIG } from '../config.js';

// Prevents interactive pager from hanging the process on any git command.
const GIT = 'git -c core.pager=cat';

const execOpts = (extra: object = {}) => ({
  cwd: CONFIG.workspaceRoot,
  encoding: 'utf-8' as const,
  timeout: CONFIG.gitTimeout,
  stdio: 'pipe' as const,
  ...extra,
});

/**
 * Verifies whether a branch ref exists locally. Falls back through 'main' →
 * 'master' → 'HEAD~1' so the caller always gets a usable base.
 */
function resolveBase(baseBranch: string): string {
  const probe = (ref: string): boolean => {
    try {
      execSync(`${GIT} rev-parse --verify ${ref}`, execOpts());
      return true;
    } catch {
      return false;
    }
  };

  if (probe(baseBranch)) return baseBranch;

  for (const fallback of ['main', 'master']) {
    if (fallback !== baseBranch && probe(fallback)) return fallback;
  }

  // Last resort: compare against the previous commit.
  return 'HEAD~1';
}

export function gitStatus(): string {
  return execSync(`${GIT} status --porcelain`, execOpts());
}

/**
 * Returns the diff between baseBranch and HEAD.
 * Pass `paths` to scope the diff to specific files and avoid binary/generated
 * content consuming the budget before the real changes appear.
 */
export function gitDiff(baseBranch = 'main', paths: string[] = []): string {
  const base = resolveBase(baseBranch);
  const pathspec = paths.length > 0 ? `-- ${paths.map((p) => `"${p}"`).join(' ')}` : '';
  return execSync(
    `${GIT} diff --no-color ${base}...HEAD ${pathspec}`,
    execOpts({ maxBuffer: 1024 * 1024 * 10 })
  );
}

export function gitLog(count = 20): string {
  return execSync(`${GIT} log --oneline -${count}`, execOpts());
}

/**
 * Returns files changed between baseBranch and HEAD.
 * Uses three-dot syntax to stay consistent with gitDiff.
 * Excludes deleted-only files (diff-filter excludes D).
 */
export function gitChangedFiles(baseBranch = 'main'): string[] {
  const base = resolveBase(baseBranch);
  const output = execSync(
    `${GIT} diff --name-only --diff-filter=ACMRT ${base}...HEAD`,
    execOpts()
  );
  return output.trim().split('\n').filter(Boolean);
}
