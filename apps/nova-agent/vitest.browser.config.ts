import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: [resolve(__dirname, './tsconfig.json')], ignoreConfigErrors: true })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vibetech/openrouter-client': resolve(__dirname, '../../packages/openrouter-client/dist/index.js'),
    },
  },
  test: {
    include: ['src/**/*.browser.test.{ts,tsx}'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    // No setup files — browser mode provides real browser APIs
    // No jsdom — we're running in a real browser
  },
});
