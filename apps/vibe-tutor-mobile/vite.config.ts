import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vibetech/auth': fileURLToPath(new URL('../../packages/auth/src/index.ts', import.meta.url)),
      '@vibetech/billing/client': fileURLToPath(
        new URL('../../packages/billing/src/client.ts', import.meta.url),
      ),
      '@vibetech/entitlements': fileURLToPath(
        new URL('../../packages/entitlements/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5194,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
