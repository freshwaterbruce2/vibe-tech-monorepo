import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentCard } from '@vibetech/shared-ipc';

export const HERMES_INSTANCE_ID = crypto.randomUUID();

/**
 * Resolve the monorepo workspace root at runtime.
 *
 * Precedence:
 *  1. WORKSPACE_ROOT env var (set in .env).
 *  2. Walk up from this module looking for the pnpm-workspace.yaml marker,
 *     so the bridge keeps working regardless of which drive the repo lives on.
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

  const fromEnv = process.env['WORKSPACE_ROOT'];
  if (fromEnv && fromEnv.trim().length > 0) {
    if (existsSync(join(fromEnv, 'pnpm-workspace.yaml'))) {
      return fromEnv;
    }
  }

  return process.cwd();
}

export const WORKSPACE_ROOT = resolveWorkspaceRoot();

export const hermesCard: AgentCard = {
  instanceId: HERMES_INSTANCE_ID,
  name: 'Hermes Bridge',
  role: 'Orchestrator',
  version: '1.0.0',
  supportedModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  maxContextTokens: 1048576,
  capabilities: ['a2a:v1', 'mcp:v1', 'antigravity-cli'],
  environment: {
    os: process.platform,
    workspaceRoot: WORKSPACE_ROOT,
    packageManager: 'pnpm',
  },
};
