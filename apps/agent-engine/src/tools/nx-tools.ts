import { CONFIG } from '../config.js';
import { runCommand } from './process-tools.js';

export function nxAffected(target: string) {
  return runCommand(`pnpm nx affected -t ${target} --plain --parallel`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.NX_TIMEOUT_MS,
  });
}

export function nxRun(project: string, target: string) {
  return runCommand(`pnpm nx run ${project}:${target}`, {
    cwd: CONFIG.WORKSPACE_ROOT,
    timeout: CONFIG.NX_TIMEOUT_MS,
  });
}
