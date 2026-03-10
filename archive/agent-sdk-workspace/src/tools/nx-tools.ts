import { execSync } from 'child_process';
import { CONFIG } from '../config.js';

export function nxAffected(target: string): string {
  return execSync(`pnpm nx affected -t ${target} --plain --parallel`, {
    cwd: CONFIG.workspaceRoot,
    encoding: 'utf-8',
    timeout: CONFIG.nxTimeout,
    stdio: 'pipe',
  });
}

export function nxRunTarget(project: string, target: string): string {
  return execSync(`pnpm nx run ${project}:${target}`, {
    cwd: CONFIG.workspaceRoot,
    encoding: 'utf-8',
    timeout: CONFIG.nxTimeout,
    stdio: 'pipe',
  });
}

export function nxProjectList(): string {
  return execSync('pnpm nx show projects', {
    cwd: CONFIG.workspaceRoot,
    encoding: 'utf-8',
  });
}
