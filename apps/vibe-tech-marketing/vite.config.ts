import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4300,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vibetech/analytics': path.resolve(__dirname, '../../packages/analytics/src'),
      '@vibetech/landing': path.resolve(__dirname, '../../packages/landing/src'),
    },
  },
});
