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
  // Vitest: server/ gateway logic runs in Node; src/ UI tests opt into jsdom via
  // a `// @vitest-environment jsdom` pragma at the top of each src test file.
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'src-tauri', '.gateway-build'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['server/**/*.ts', 'src/**/*.{ts,tsx}'],
      exclude: [
        'server/**/*.test.ts',
        'server/index.ts',
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/main.tsx',
      ],
    },
  },
});
