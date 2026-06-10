#!/usr/bin/env node
/**
 * Fetch better-sqlite3 prebuilt binaries for the Electron ABIs this app can
 * run under in dev mode, WITHOUT touching the shared Node-ABI binary in the
 * workspace root node_modules (live MCP servers load that one under system
 * Node and would break if it were rebuilt for Electron).
 *
 * Dev mode may launch either the app-local electron or the hoisted root
 * electron depending on module resolution, so prebuilds are fetched for both
 * ABIs into <app>/native. sqlite-worker.ts picks the one matching
 * process.versions.modules at runtime via better-sqlite3's nativeBinding
 * option. Packaged builds do not use these files (see rebuild-native.mjs).
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(fileURLToPath(import.meta.url), '..', '..');
const rootDir = resolve(appDir, '..', '..');
const nativeDir = join(appDir, 'native');

const requireFromApp = createRequire(join(appDir, 'package.json'));
const requireFromRoot = createRequire(join(rootDir, 'package.json'));

const betterSqlite3Version = requireFromRoot('better-sqlite3/package.json').version;
const nodeAbi = requireFromRoot('node-abi');

const electronVersions = new Set();
for (const req of [requireFromApp, requireFromRoot]) {
  try {
    electronVersions.add(req('electron/package.json').version);
  } catch {
    // electron not resolvable from this dir
  }
}
if (electronVersions.size === 0) {
  console.error('[fetch-electron-native] No electron package resolvable - is the workspace installed?');
  process.exit(1);
}

mkdirSync(nativeDir, { recursive: true });

for (const electronVersion of electronVersions) {
  const abiVersion = nodeAbi.getAbi(electronVersion, 'electron');
  const targetFile = join(nativeDir, `better_sqlite3-electron-v${abiVersion}.node`);
  const markerFile = join(nativeDir, `better_sqlite3-electron-v${abiVersion}.json`);

  if (existsSync(targetFile) && existsSync(markerFile)) {
    try {
      const marker = JSON.parse(readFileSync(markerFile, 'utf8'));
      if (marker.betterSqlite3 === betterSqlite3Version) {
        console.log(`[fetch-electron-native] ABI ${abiVersion} (Electron ${electronVersion}) already cached.`);
        continue;
      }
    } catch {
      // unreadable marker: refetch
    }
  }

  const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${betterSqlite3Version}/better-sqlite3-v${betterSqlite3Version}-electron-v${abiVersion}-win32-x64.tar.gz`;
  console.log(`[fetch-electron-native] Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[fetch-electron-native] Download failed: HTTP ${res.status} for ${url}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());

  const tmp = mkdtempSync(join(tmpdir(), 'bsqlite-electron-'));
  try {
    const tarball = join(tmp, 'prebuild.tar.gz');
    writeFileSync(tarball, buf);
    // Windows 11 ships bsdtar as tar.exe
    execFileSync('tar', ['-xzf', tarball, '-C', tmp]);
    copyFileSync(join(tmp, 'build', 'Release', 'better_sqlite3.node'), targetFile);
    writeFileSync(markerFile, JSON.stringify({ betterSqlite3: betterSqlite3Version, electron: electronVersion }, null, 2));
    console.log(`[fetch-electron-native] Installed ${targetFile}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
