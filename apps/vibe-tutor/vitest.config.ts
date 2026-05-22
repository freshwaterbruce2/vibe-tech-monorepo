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
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
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
