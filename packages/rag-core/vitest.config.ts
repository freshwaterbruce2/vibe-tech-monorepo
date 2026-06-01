import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@vibetech/logger': resolve(__dirname, '../logger/src/index.ts'),
      '@vibetech/shared-config': resolve(__dirname, '../shared-config/src/index.ts'),
      '@vibetech/inngest-client': resolve(__dirname, '../inngest-client/src/index.ts'),
      '@vibetech/openrouter-client': resolve(__dirname, '../openrouter-client/src/index.ts'),
    },
  },
});
