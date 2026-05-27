const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(appRoot, 'android');

function runCap(args) {
  const result = spawnSync('pnpm', ['exec', 'cap', ...args], {
    cwd: appRoot,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[ensure-android] Failed to start Capacitor: ${result.error.message}`);
    process.exit(1);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

if (!fs.existsSync(androidRoot)) {
  runCap(['add', 'android']);
}

runCap(['sync', 'android']);
