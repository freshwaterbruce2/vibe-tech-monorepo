import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, isAbsolute, join } from 'path';
import { CONFIG } from '../config.js';

export function resolveWorkspacePath(filePath: string): string {
  return isAbsolute(filePath) ? filePath : join(CONFIG.WORKSPACE_ROOT, filePath);
}

export function readTextFile(filePath: string): string {
  return readFileSync(resolveWorkspacePath(filePath), 'utf-8');
}

export function writeTextFile(filePath: string, content: string): void {
  const resolved = resolveWorkspacePath(filePath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, content, 'utf-8');
}

export function pathExists(filePath: string): boolean {
  return existsSync(resolveWorkspacePath(filePath));
}
