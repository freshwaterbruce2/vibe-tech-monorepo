import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  console.log(`prepare-workspace: Windows setup skipped on ${process.platform}.`);
  process.exit(0);
}

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(scriptsDirectory);
const setupScripts = ['configure-pnpm-store.ps1', 'install-git-hooks.ps1'];

for (const scriptName of setupScripts) {
  const result = spawnSync(
    'pwsh',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(scriptsDirectory, scriptName),
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  if (result.error) {
    console.error(`prepare-workspace: unable to run ${scriptName}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
