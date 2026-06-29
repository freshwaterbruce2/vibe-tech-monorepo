import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Frontend dev server for the Tauri webview.
// The UI talks to the Express gateway on :8675 (see server/index.ts).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  // Vitest: server/ gateway logic runs in Node (no DOM); UI tests can opt into jsdom.
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'src-tauri', '.gateway-build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.test.ts', 'server/index.ts'],
    },
  },
});
