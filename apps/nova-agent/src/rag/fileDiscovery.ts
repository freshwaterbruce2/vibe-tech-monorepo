/**
 * File discovery utilities for RAG indexer.
 * Walks workspace, filters by extension/size, respects exclusion patterns.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type { RAGConfig } from './types.js';

export const INDEXABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.md', '.mdx', '.json', '.jsonc',
]);

export const MAX_FILE_SIZE = 500_000; // 500KB — skip larger files

/**
 * Discover all indexable files under the configured index paths.
 */
export function discoverFiles(config: RAGConfig): string[] {
  const files: string[] = [];
  for (const indexPath of config.indexPaths) {
    const fullPath = join(config.workspaceRoot, indexPath);
    if (!existsSync(fullPath)) continue;
    walkDirectory(fullPath, files, config);
  }
  return files;
}

function walkDirectory(dir: string, results: string[], config: RAGConfig): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(config.workspaceRoot, fullPath).replace(/\\/g, '/');

    if (isExcluded(relPath, config.excludePatterns)) continue;

    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkDirectory(fullPath, results, config);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (INDEXABLE_EXTENSIONS.has(ext) && stat.size <= MAX_FILE_SIZE) {
        results.push(fullPath);
      }
    }
  }
}

/**
 * Check if a relative path matches any exclusion pattern.
 */
export function isExcluded(relPath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    const regex = pattern
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{DOUBLESTAR\}\}/g, '.*');

    if (new RegExp(`^${regex}$`).test(relPath)) return true;
    if (new RegExp(`(^|/)${regex}`).test(relPath)) return true;
  }
  return false;
}
