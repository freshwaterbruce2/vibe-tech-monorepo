/**
 * Shared recursive workspace tree walker.
 *
 * Extracted from WorkspaceService so every feature that needs a full file
 * tree (workspace indexing, project quality review) shares one traversal
 * with the same directory exclusions and depth guard.
 */
import { logger } from '../services/Logger';

import type { FileSystemItem } from '../types';

/** Minimal file-access surface the walker needs (real FS or a test double). */
export interface TreeWalkerFileSystem {
  listDirectory(path: string): Promise<FileSystemItem[]>;
}

// Directories never worth walking (build output, deps, VCS metadata).
export const DEFAULT_IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.nx',
  '.cache',
  'target',
  '.turbo',
  '.vite',
]);

const DEFAULT_MAX_DEPTH = 8;

export interface WalkOptions {
  maxDepth?: number;
  ignoredDirs?: ReadonlySet<string>;
}

/** Build a real recursive file tree from the workspace, skipping build/dep dirs. */
export async function walkDirectoryTree(
  fs: TreeWalkerFileSystem,
  rootPath: string,
  options: WalkOptions = {}
): Promise<FileSystemItem[]> {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const ignoredDirs = options.ignoredDirs ?? DEFAULT_IGNORED_DIRS;
  return readTreeChildren(fs, rootPath, 0, maxDepth, ignoredDirs);
}

async function readTreeChildren(
  fs: TreeWalkerFileSystem,
  dirPath: string,
  depth: number,
  maxDepth: number,
  ignoredDirs: ReadonlySet<string>
): Promise<FileSystemItem[]> {
  if (depth > maxDepth) {
    return [];
  }

  let entries: FileSystemItem[];
  try {
    entries = await fs.listDirectory(dirPath);
  } catch (error) {
    logger.warn(`[fileTreeWalker] Failed to list ${dirPath}:`, error);
    return [];
  }

  const result: FileSystemItem[] = [];
  for (const entry of entries) {
    if (entry.type === 'directory') {
      if (ignoredDirs.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      const children = await readTreeChildren(fs, entry.path, depth + 1, maxDepth, ignoredDirs);
      result.push({ ...entry, children });
    } else {
      result.push(entry);
    }
  }
  return result;
}
