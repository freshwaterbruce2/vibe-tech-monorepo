#!/usr/bin/env node
/**
 * Rebuild better-sqlite3 against Electron's ABI using prebuild-install.
 * Backs up the system-Node binary first so `restore-native.mjs` can reinstate it
 * after packaging, keeping Vitest tests working on system Node.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(fileURLToPath(import.meta.url), '..', '..');
const rootNodeModules = resolve(appDir, '..', '..', 'node_modules');
const betterSqliteDir = join(rootNodeModules, 'better-sqlite3');
const binaryPath = join(betterSqliteDir, 'build', 'Release', 'better_sqlite3.node');
const backupPath = binaryPath + '.system-bak';
const prebuildInstall = join(rootNodeModules, '.bin', 'prebuild-install.cmd');

// Back up the current (system-Node ABI) binary before replacing it.
if (existsSync(binaryPath) && !existsSync(backupPath)) {
  copyFileSync(binaryPath, backupPath);
  console.log('[rebuild-native] Backed up system-Node binary to:', backupPath);
}

console.log('[rebuild-native] Installing Electron 33.4.11 binary (ABI 130)...');
execFileSync(prebuildInstall, ['--runtime=electron', '--target=33.4.11', '--arch=x64'], {
  cwd: betterSqliteDir,
  stdio: 'inherit',
  shell: true
});
console.log('[rebuild-native] Done — Electron binary in place for packaging.');
