import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolve the monorepo workspace root at runtime.
 *
 * Precedence:
 *  1. WORKSPACE_ROOT env var (set in .env).
 *  2. Walk up from this module looking for the pnpm-workspace.yaml marker,
 *     so the tools follow the repo regardless of which drive it lives on.
 *  3. Fall back to the current working directory.
 */
export function resolveWorkspaceRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  const fromEnv = process.env.WORKSPACE_ROOT;
  if (fromEnv && fromEnv.trim().length > 0) {
    if (existsSync(join(fromEnv, 'pnpm-workspace.yaml'))) {
      return fromEnv;
    }
  }

  return process.cwd();
}

export const WORKSPACE_ROOT = resolveWorkspaceRoot();
