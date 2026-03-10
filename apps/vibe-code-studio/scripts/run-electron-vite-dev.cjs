#!/usr/bin/env node

const { spawn } = require('node:child_process');

const env = {};
for (const [key, value] of Object.entries(process.env)) {
  // Windows can expose pseudo variables (for example "=C:") that break spawn when copied verbatim.
  if (!key.startsWith('=') && typeof value === 'string') {
    env[key] = value;
  }
}
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn('pnpm exec electron-vite dev', {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[run-electron-vite-dev] Failed to start:', error);
  process.exit(1);
});
