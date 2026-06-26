/**
 * build-sidecar.cjs
 *
 * Packages the Node backend (scripts/backend-server.js) into a self-contained
 * Tauri sidecar so the INSTALLED desktop app can run the AI proxy + auth backend
 * on port 5004 without any dev tooling.
 *
 * Strategy (robust, no new deps):
 *   1. esbuild-bundle backend-server.js + all pure-JS deps into one ESM file,
 *      marking the only native module (better-sqlite3) as external.
 *   2. Ship better-sqlite3 + its runtime deps (bindings, file-uri-to-path) as a
 *      minimal adjacent node_modules so `import 'better-sqlite3'` resolves on disk.
 *   3. Ship the current node.exe as the Tauri externalBin sidecar (ABI-matched to
 *      the prebuilt better_sqlite3.node).
 *
 * Run automatically by tauri.conf.json `beforeBuildCommand` before `pnpm run build`.
 * Outputs are build artifacts (gitignored): src-tauri/sidecar/** and src-tauri/binaries/**.
 */
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const log = (m) => process.stdout.write(`[build-sidecar] ${m}\n`);

const appRoot = path.resolve(__dirname, '..');
const monoRoot = path.resolve(appRoot, '..', '..');
const entry = path.join(appRoot, 'scripts', 'backend-server.js');
const sidecarDir = path.join(appRoot, 'src-tauri', 'sidecar');
const sidecarNodeModules = path.join(sidecarDir, 'node_modules');
const outFile = path.join(sidecarDir, 'backend-bundle.mjs');
const binDir = path.join(appRoot, 'src-tauri', 'binaries');

// Windows MSVC target triple — Tauri appends this to the externalBin base name.
const TARGET_TRIPLE = 'x86_64-pc-windows-msvc';
const sidecarExe = path.join(binDir, `vcs-backend-${TARGET_TRIPLE}.exe`);

// Native module + its runtime deps that cannot be inlined by esbuild.
const NATIVE_MODULES = ['better-sqlite3', 'bindings', 'file-uri-to-path'];

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function bytes(p) {
  try {
    const st = fs.statSync(p);
    return st.isDirectory()
      ? fs.readdirSync(p).reduce((n, c) => n + bytes(path.join(p, c)), 0)
      : st.size;
  } catch {
    return 0;
  }
}

function copyBetterSqlite3(src, dest) {
  // Copy the package but drop build-time-only weight (C/C++ sources, intermediate
  // objects, debug symbols). Keep lib/, package.json and the prebuilt .node.
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const rel = path.relative(src, s).replace(/\\/g, '/');
      if (rel === 'deps' || rel.startsWith('deps/')) return false;
      if (rel === 'src' || rel.startsWith('src/')) return false;
      if (rel.startsWith('build/Release/obj')) return false;
      if (/\.(pdb|lib|exp|iobj|ipdb|tlog)$/i.test(rel)) return false;
      return true;
    },
  });
}

async function main() {
  log(`app root: ${appRoot}`);
  rmrf(sidecarDir);
  fs.mkdirSync(sidecarNodeModules, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });

  // 1) Bundle the backend (ESM; better-sqlite3 external). The banner provides a
  // `require` for any dynamic CommonJS require left by bundled deps (e.g. stripe).
  log('bundling backend with esbuild…');
  const result = await esbuild.build({
    entryPoints: [entry],
    outfile: outFile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: NATIVE_MODULES,
    banner: {
      js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
    },
    logLevel: 'info',
    metafile: true,
  });
  const inputs = Object.keys(result.metafile.inputs).length;
  log(`bundled ${inputs} modules → ${outFile} (${(bytes(outFile) / 1024).toFixed(0)} KB)`);

  // 2) Ship the native module + runtime deps next to the bundle.
  for (const mod of NATIVE_MODULES) {
    const src = path.join(monoRoot, 'node_modules', mod);
    if (!fs.existsSync(src)) {
      throw new Error(`Native dependency not found: ${src}`);
    }
    const dest = path.join(sidecarNodeModules, mod);
    if (mod === 'better-sqlite3') {
      copyBetterSqlite3(src, dest);
    } else {
      fs.cpSync(src, dest, { recursive: true });
    }
    log(`copied ${mod} (${(bytes(dest) / 1024).toFixed(0)} KB)`);
  }

  // Verify the prebuilt addon made it across.
  const addon = path.join(
    sidecarNodeModules,
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node',
  );
  if (!fs.existsSync(addon)) {
    throw new Error(`Prebuilt addon missing after copy: ${addon}`);
  }

  // 3) Ship the ABI-matched node runtime as the externalBin sidecar.
  fs.copyFileSync(process.execPath, sidecarExe);
  log(`copied node runtime → ${sidecarExe} (${(bytes(sidecarExe) / 1024 / 1024).toFixed(1)} MB)`);

  log(`DONE. node ${process.version} (MODULE_VERSION ${process.versions.modules}).`);
}

main().catch((err) => {
  process.stderr.write(`[build-sidecar] FAILED: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
