/**
 * build-gateway.mjs - compile the Express gateway into a self-contained binary
 * named for the Tauri sidecar: src-tauri/binaries/gateway-<target-triple><ext>.
 *
 * Pipeline: esbuild (bundle ESM server -> single CJS) -> @yao-pkg/pkg -> rename to triple.
 * Run: pnpm build:gateway   (also runs automatically before `pnpm build` via tauri.conf)
 */
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = join(root, '.gateway-build');
const binDir = join(root, 'src-tauri', 'binaries');
const bundle = join(buildDir, 'gateway.cjs');
const ext = process.platform === 'win32' ? '.exe' : '';

mkdirSync(buildDir, { recursive: true });
mkdirSync(binDir, { recursive: true });

// Resolve NodeNext-style `./x.js` imports to their `.ts` sources during bundling.
const tsJsResolve = {
  name: 'ts-js-resolve',
  setup(b) {
    b.onResolve({ filter: /^\.\.?\/.*\.js$/ }, (args) => {
      const tsPath = join(args.resolveDir, args.path.replace(/\.js$/, '.ts'));
      return existsSync(tsPath) ? { path: tsPath } : undefined;
    });
  },
};

console.log('[build:gateway] bundling server/index.ts -> gateway.cjs (esbuild)…');
await build({
  entryPoints: [join(root, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: bundle,
  plugins: [tsJsResolve],
  logLevel: 'info',
});

console.log('[build:gateway] compiling -> binary (@yao-pkg/pkg, current OS)…');
execSync(`pnpm exec pkg "${bundle}" --targets host --output "${join(binDir, `gateway${ext}`)}"`, {
  cwd: root,
  stdio: 'inherit',
});

// Tauri sidecars must be suffixed with the host target triple.
let triple = '';
try {
  triple = execSync('rustc --print host-tuple').toString().trim();
} catch {
  triple = /host: (\S+)/.exec(execSync('rustc -vV').toString())?.[1] ?? '';
}
if (!triple) throw new Error('could not determine host target triple (is rustc installed?)');

const finalPath = join(binDir, `gateway-${triple}${ext}`);
if (existsSync(finalPath)) rmSync(finalPath);
renameSync(join(binDir, `gateway${ext}`), finalPath);
console.log(`[build:gateway] done -> src-tauri/binaries/gateway-${triple}${ext}`);
