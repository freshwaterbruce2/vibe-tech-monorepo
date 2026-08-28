import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
// Tauri 2.x compatible configuration
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
  },
  // Prevent Vite from obscuring Rust errors
  clearScreen: false,
  server: {
    port: 5175,
    strictPort: true, // Tauri requires strict port
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    },
    // Tauri expects a fixed port
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  // Env variables starting with TAURI_ will be exposed to the frontend
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Windows 11 only (per platform rules) — Tauri Chromium on Windows
    target: 'chrome105',
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'radix-ui': ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
        },
      },
    },
  },
})
