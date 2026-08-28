/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as unknown as any],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup-env.ts', './tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/*.spec.ts'],
    include: ['**/*.test.{ts,tsx}', 'electron/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'json-summary', 'html'],
      // `all` instruments every in-scope source file, not just those a test
      // imports — so untested files surface in the report and the diff-coverage
      // gate (which reads coverage-final.json) can see them.
      all: true,
      include: ['src/**/*.{ts,tsx}', 'electron/csp.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/types.ts',
        'src/**/*.types.ts',
        'src/types/**',
        'src/**/*.config.*',
        'src/vite-env.d.ts',
        'electron/**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@vibetech/avatars': resolve(__dirname, '../../packages/avatars/src/index.ts'),
      '@vibetech/games/tutor': resolve(__dirname, '../../packages/games/src/tutor/index.ts'),
      '@vibetech/games': resolve(__dirname, '../../packages/games/src/index.ts'),
    },
  },
});
