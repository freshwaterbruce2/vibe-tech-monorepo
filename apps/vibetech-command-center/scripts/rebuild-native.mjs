#!/usr/bin/env node
/**
 * Rebuild better-sqlite3 against Electron's ABI using prebuild-install.
 * Backs up the system-Node binary first so `restore-native.mjs` can reinstate it
 * after packaging, keeping Vitest tests working on system Node.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(fileURLToPath(import.meta.url), '..', '..');
// electron-builder packages with the electron resolved from the app dir, so
// the swapped-in binary must match that version, not a hardcoded one.
const electronVersion = createRequire(join(appDir, 'package.json'))('electron/package.json').version;
const rootNodeModules = resolve(appDir, '..', '..', 'node_modules');
const betterSqliteDir = join(rootNodeModules, 'better-sqlite3');
const binaryPath = join(betterSqliteDir, 'build', 'Release', 'better_sqlite3.node');
const backupPath = `${binaryPath}.system-bak`;
const prebuildInstall = join(rootNodeModules, '.bin', 'prebuild-install.cmd');

// Back up the current (system-Node ABI) binary before replacing it.
if (existsSync(binaryPath) && !existsSync(backupPath)) {
  copyFileSync(binaryPath, backupPath);
  console.warn('[rebuild-native] Backed up system-Node binary to:', backupPath);
}

console.warn(`[rebuild-native] Installing Electron ${electronVersion} binary...`);
execFileSync(prebuildInstall, ['--runtime=electron', `--target=${electronVersion}`, '--arch=x64'], {
  cwd: betterSqliteDir,
  stdio: 'inherit',
  shell: true
});
console.warn('[rebuild-native] Done - Electron binary in place for packaging.');
