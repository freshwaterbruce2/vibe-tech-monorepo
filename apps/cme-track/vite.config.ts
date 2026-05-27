import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4360,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5360',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'server/src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e'],
  },
});
