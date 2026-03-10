/**
 * Memory Monitor Hook
 * Monitors memory usage during development
 */

const { spawn } = require('child_process');
const path = require('path');

const APP_DIR = path.join(__dirname, '..');

console.log('🧠 Memory Monitor Starting...\n');
console.log('📊 This will monitor memory usage of the Electron app');
console.log('⏱️  Press Ctrl+C to stop monitoring\n');

// Start Electron in development mode with memory profiling
const electron = spawn('npm', ['run', 'dev'], {
  cwd: APP_DIR,
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--expose-gc --max-old-space-size=4096',
    ELECTRON_ENABLE_LOGGING: '1'
  }
});

// Monitor memory every 5 seconds
let intervalId = null;

electron.on('spawn', () => {
  console.log('✅ Electron started - monitoring memory...\n');

  intervalId = setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log(`📊 Memory Usage:
  RSS:      ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB
  Heap:     ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
  External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB
`);
  }, 5000);
});

electron.on('close', (code) => {
  if (intervalId) clearInterval(intervalId);
  console.log(`\n📊 Electron exited with code ${code}`);
  console.log('💾 Memory monitoring stopped');
  process.exit(code || 0);
});

// Handle cleanup on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping memory monitor...');
  if (intervalId) clearInterval(intervalId);
  electron.kill('SIGTERM');
});
