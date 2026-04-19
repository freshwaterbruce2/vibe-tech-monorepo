import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'tests/unit/**/*.spec.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    environmentMatchGlobs: [
      ['src/renderer/**/*.spec.tsx', 'jsdom'],
      ['src/renderer/**/*.spec.ts', 'jsdom'],
      ['**', 'node']
    ],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/main/services/**/*.ts', 'src/renderer/**/*.{ts,tsx}'],
      exclude: ['**/*.spec.*']
    }
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer')
    }
  }
});
