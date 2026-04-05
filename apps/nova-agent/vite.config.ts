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
const NODE_BUILTINS = new Set([
  'fs',
  'path',
  'child_process',
  'util',
  'os',
  'electron',
  'node:fs',
  'node:path',
  'node:child_process',
  'node:util',
  'node:os',
]);

const STUB_ID = '\0node-builtin-stub';

function stubNodeBuiltins(): Plugin {
  return {
    name: 'stub-node-builtins',
    enforce: 'pre',
    resolveId(source) {
      if (NODE_BUILTINS.has(source)) {
        return STUB_ID;
      }
      return null;
    },
    load(id) {
      if (id === STUB_ID) {
        return `
					const noop = () => {};
					const noopStr = () => "";
					const noopArr = () => [];
					const noopPromise = () => Promise.resolve();

					// fs stubs
					export const existsSync = () => false;
					export const readFileSync = noopStr;
					export const writeFileSync = noop;
					export const mkdirSync = noop;
					export const readdirSync = noopArr;
					export const accessSync = noop;
					export const readFile = noopPromise;
					export const writeFile = noopPromise;
					export const mkdir = noopPromise;
					export const exists = noopPromise;
					export const constants = { W_OK: 2, R_OK: 4, F_OK: 0 };

					// path stubs
					export const join = (...a) => a.join("/");
					export const resolve = (...a) => a.join("/");
					export const basename = (p) => (p || "").split("/").pop() || "";
					export const dirname = (p) => (p || "").split("/").slice(0, -1).join("/");

					// child_process stubs
					export const exec = noop;
					export const execSync = noopStr;
					export const spawn = noop;

					// util stubs
					export const promisify = (fn) => fn;

					// electron stubs
					export const app = { getPath: () => "/stub" };
					export const ipcMain = {};
					export const ipcRenderer = {};
					export const BrowserWindow = {};

					export default {
						existsSync, readFileSync, writeFileSync, mkdirSync,
						readdirSync, accessSync, constants, join, resolve,
						basename, dirname, exec, promisify, app
					};
				`;
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss: http: https: data:;",
    },
  },
  base: './',
  plugins: [
    stubNodeBuiltins(),
    react(),
    tsconfigPaths({
      projects: [path.resolve(__dirname, './tsconfig.json')],
      ignoreConfigErrors: true,
    }),
    removeCrossOrigin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vibetech/openrouter-client': path.resolve(
        __dirname,
        '../../packages/openrouter-client/dist/index.js',
      ),
    },
  },
  build: {
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      external: [
        // Tauri APIs (loaded at runtime by Tauri shell)
        '@tauri-apps/api',
        '@tauri-apps/plugin-fs',
        '@tauri-apps/plugin-shell',
      ],
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
