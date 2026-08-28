import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vibetech/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@vibetech/shared-ipc': resolve(__dirname, '../../packages/shared-ipc/src/index.ts'),
      '@vibetech/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@vibetech/feature-flags-core': resolve(
        __dirname,
        '../../packages/feature-flags/core/src/index.ts'
      ),
      '@vibetech/feature-flags-sdk-node': resolve(
        __dirname,
        '../../packages/feature-flags/sdk-node/src/index.ts'
      ),
      'monaco-editor': resolve(__dirname, 'src/__tests__/__mocks__/monaco-editor.ts'),
      '@monaco-editor/react': resolve(
        __dirname,
        'src/__tests__/__mocks__/@monaco-editor/react.tsx'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Vitest 4's default forks pool spawns one worker per CPU; under machine load
    // its workers intermittently stop polling IPC and time out ("Failed to start
    // forks worker — Timeout waiting for worker to respond", vitest #8766/#9701),
    // which starves the ~100-file suite and drops coverage. Cap fork concurrency
    // to cut contention, and raise the test/hook timeouts to absorb slow workers.
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 2 } },
    testTimeout: 20000,
    hookTimeout: 30000,
    exclude: [
      '**/node_modules/**',
      'tests/**/*.spec.ts',
      'tests/electron/**',
      '**/dist/**',
      '**/dist-electron/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        'dist/',
        'coverage/',
        'vite.config.ts',
        'vitest.config.ts',
        '.eslintrc.js',
      ],
      // No global thresholds: per-changed-line enforcement is handled by the
      // pre-commit diff-coverage gate (scripts/check-diff-coverage.js). A global
      // floor here would only fail the report generation the gate depends on.
    },
  },
});
