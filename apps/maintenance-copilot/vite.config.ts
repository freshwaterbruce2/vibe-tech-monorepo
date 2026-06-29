import { defineConfig } from 'vite';
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
});
