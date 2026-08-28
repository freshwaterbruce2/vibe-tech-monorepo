/**
 * File hash management for RAG indexer.
 * Tracks SHA-256 hashes to detect changed files between index runs.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { relative } from 'node:path';
import type { FileHash } from './types.js';

/**
 * Load file hashes from the hash index JSON file.
 */
export function loadFileHashes(hashIndexPath: string): Map<string, FileHash> {
  try {
    if (existsSync(hashIndexPath)) {
      const data = JSON.parse(readFileSync(hashIndexPath, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch {
    // Corrupted or unreadable — start fresh
  }
  return new Map();
}

/**
 * Persist file hashes to the hash index JSON file.
 */
export function saveFileHashes(
  hashIndexPath: string,
  hashes: Map<string, FileHash>,
): void {
  const data = Object.fromEntries(hashes);
  writeFileSync(hashIndexPath, JSON.stringify(data, null, 2));
}

/**
 * Check whether a file's content has changed since it was last indexed.
 */
export function isFileChanged(
  filePath: string,
  workspaceRoot: string,
  fileHashes: Map<string, FileHash>,
): boolean {
  const relPath = relative(workspaceRoot, filePath).replace(/\\/g, '/');
  const existing = fileHashes.get(relPath);
  if (!existing) return true;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const hash = createHash('sha256').update(content).digest('hex');
    return hash !== existing.hash;
  } catch {
    return true;
  }
}
