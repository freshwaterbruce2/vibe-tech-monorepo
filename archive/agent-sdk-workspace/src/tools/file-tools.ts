import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { CONFIG } from '../config.js';

export function readFile(filePath: string): string {
  const fullPath = filePath.startsWith('C:') ? filePath : join(CONFIG.workspaceRoot, filePath);
  return readFileSync(fullPath, 'utf-8');
}

export function writeFile(filePath: string, content: string): void {
  const fullPath = filePath.startsWith('C:') ? filePath : join(CONFIG.workspaceRoot, filePath);
  writeFileSync(fullPath, content, 'utf-8');
}

export function listFiles(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
  const fullDir = dir.startsWith('C:') ? dir : join(CONFIG.workspaceRoot, dir);
  const results: string[] = [];

  function walk(current: string) {
    if (!existsSync(current)) return;
    for (const entry of readdirSync(current)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.nx' || entry.startsWith('.')) continue;
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        results.push(relative(CONFIG.workspaceRoot, full));
      }
    }
  }

  walk(fullDir);
  return results;
}

export function fileExists(filePath: string): boolean {
  const fullPath = filePath.startsWith('C:') ? filePath : join(CONFIG.workspaceRoot, filePath);
  return existsSync(fullPath);
}
