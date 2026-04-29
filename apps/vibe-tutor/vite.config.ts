import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

// Vite config
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      visualizer({
        open: false, // Don't auto-open in CI, but file will be generated
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/bundle-analysis.html',
        template: 'treemap', // Options: treemap, sunburst, network
      }),
    ] as unknown[],
    base: mode === 'development' ? '/' : './',
    build: {
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('@react-spring')) return 'vendor-spring';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (
              id.includes('@capacitor') ||
              id.includes('@capacitor-community/sqlite') ||
              id.includes('jeep-sqlite')
            ) {
              return 'vendor-capacitor';
            }
            if (id.includes('@sentry')) return 'vendor-sentry';
            if (id.includes('music-metadata')) return 'vendor-audio-metadata';

            return 'vendor-misc';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        // Proxy API calls to backend during development
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
