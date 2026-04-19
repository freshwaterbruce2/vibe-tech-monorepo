#!/usr/bin/env node
/**
 * Restore the system-Node better-sqlite3 binary after packaging.
 * Reverts the Electron binary installed by rebuild-native.mjs so
 * Vitest unit tests keep working under system Node.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(fileURLToPath(import.meta.url), '..', '..');
const rootNodeModules = resolve(appDir, '..', '..', 'node_modules');
const binaryPath = join(rootNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const backupPath = binaryPath + '.system-bak';

if (!existsSync(backupPath)) {
  console.log('[restore-native] No backup found — nothing to restore.');
  process.exit(0);
}

copyFileSync(backupPath, binaryPath);
console.log('[restore-native] System-Node binary restored from:', backupPath);
