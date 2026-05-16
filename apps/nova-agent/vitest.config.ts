import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  plugins: [react(), tsconfigPaths({ projects: [resolve(__dirname, './tsconfig.json')], ignoreConfigErrors: true })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vibetech/openrouter-client': resolve(__dirname, '../../packages/openrouter-client/dist/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/*.browser.test.{ts,tsx}', 'node_modules'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**', 'src/main.tsx'],
      thresholds: {
        lines: 45,
        functions: 40,
        branches: 35,
        statements: 45,
      },
    },
  },
});
