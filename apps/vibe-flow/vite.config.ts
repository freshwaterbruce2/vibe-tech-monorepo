import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri's custom asset protocol may not serve CORS headers; module scripts
// with crossorigin attributes fail to load in the webview. Strip them.
const stripCrossorigin = (): Plugin => ({
  name: 'strip-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/\scrossorigin(="[^"]*")?/g, '');
  },
});

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [react(), stripCrossorigin()],
  build: {
    target: ['es2022', 'chrome95'],
    outDir: 'dist',
  },
  clearScreen: false,
  server: {
    port: 5175,
    strictPort: true,
  },
}));
