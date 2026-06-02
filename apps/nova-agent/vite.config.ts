import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Strip crossorigin attributes from HTML — these break Tauri's tauri://localhost origin
function removeCrossOrigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    },
  };
}

// Stub Node.js builtins that leak into the browser bundle.
// src/features/*.ts, src/cli.ts, @vibetech/shared-utils/path-registry.js,
// and the workspace-level `electron` package import fs, path, child_process,
// util, and electron — none of which exist in WebView2.
// This plugin redirects those imports to a virtual stub at build time.
// Node built-ins are stubbed via resolve.alias mapping directly to src/stubs/node-builtins-stub.ts

// Custom plugin to support Chromium's "Automatic Workspace Folders" feature (M-135+)
function devtoolsWorkspacePlugin(): Plugin {
  return {
    name: 'vite-plugin-devtools-workspace',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url ? req.url.split('?')[0] : '';
        if (urlPath === '/.well-known/appspecific/com.chrome.devtools.json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            workspace: {
              root: path.resolve(__dirname).replace(/\\/g, '/'),
              uuid: 'a58e6dfd-2101-4475-b6d3-2f22b79a838b',
            },
          }));
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  // Persistent cache directory for faster rebuilds
  cacheDir: '.vite-cache',

  server: {
    host: '::',
    port: 5173,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy':
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss: http: https: data: blob:; worker-src 'self' blob:;",
    },
  },
  base: './',
  plugins: [
    devtoolsWorkspacePlugin(),
    react(),
    tsconfigPaths({
      projects: [path.resolve(__dirname, './tsconfig.json')],
      ignoreConfigErrors: true,
    }),
    removeCrossOrigin(),
  ].filter(Boolean),
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: '@vibetech/openrouter-client',
        replacement: path.resolve(
          __dirname,
          '../../packages/openrouter-client/dist/index.js',
        ),
      },
      {
        find: '@vibetech/shared-config',
        replacement: path.resolve(__dirname, './src/stubs/shared-config-shim.ts'),
      },
      {
        find: 'better-sqlite3',
        replacement: path.resolve(__dirname, './src/stubs/node-empty.ts'),
      },
      // Exact Node.js built-ins shims using RegExp
      {
        find: /^(node:)?fs(\/promises)?$/,
        replacement: path.resolve(__dirname, './src/stubs/node-builtins-stub.ts'),
      },
      {
        find: /^(node:)?path(\/(posix|win32))?$/,
        replacement: path.resolve(__dirname, './src/stubs/node-builtins-stub.ts'),
      },
      {
        find: /^(node:)?(child_process|util|os|electron|crypto|url|stream|events|process|async_hooks|buffer|http|https|zlib|net|tls|dns|readline|vm|perf_hooks)$/,
        replacement: path.resolve(__dirname, './src/stubs/node-builtins-stub.ts'),
      },
    ],
  },
  build: {
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast', '@radix-ui/react-tabs'],
          router: ['react-router-dom'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    sourcemap: mode !== 'production',
  },
  optimizeDeps: {
    // Pre-bundle common dependencies for faster dev server start
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-toast',
      '@radix-ui/react-tabs',
      'react-hook-form',
      'zod',
    ],
    // Only force rebuild on lock file changes
    force: false,
  },
  // Force Vite to bundle workspace packages (not externalize them)
  ssr: {
    noExternal: ['@vibetech/openrouter-client'],
  },
}));

