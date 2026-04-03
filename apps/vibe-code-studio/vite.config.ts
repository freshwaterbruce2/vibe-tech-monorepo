import react from '@vitejs/plugin-react'
import { builtinModules } from 'module'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'

const rendererPort = Number(process.env.VIBE_RENDERER_PORT ?? process.env.VITE_PORT ?? 5174)

const nodeBuiltins = [
  'fs', 'path', 'os', 'crypto', 'http', 'https', 'net', 'tls',
  'stream', 'zlib', 'url', 'util', 'events', 'buffer', 'child_process',
  'dns', 'dgram', 'cluster', 'module', 'readline', 'vm', 'assert',
  'constants', 'querystring', 'string_decoder', 'punycode', 'tty',
  'worker_threads', 'perf_hooks', 'async_hooks',
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
]

export default defineConfig(({ mode }) => ({
  // @monaco-editor/react handles workers automatically - NO plugin needed
  base: mode === 'production' ? './' : '/',

  plugins: [
    react(),

    // @monaco-editor/react handles Monaco workers internally - no plugin needed

    viteCompression({
      algorithm: 'gzip',
      threshold: 10240
    }),

    viteCompression({
      algorithm: 'brotliCompress',
      threshold: 10240,
      ext: '.br'
    }),

    // Strip crossorigin from module scripts — Tauri's custom protocol may not serve CORS headers
    {
      name: 'strip-crossorigin',
      enforce: 'post' as const,
      transformIndexHtml(html: string) {
        return html.replace(/ crossorigin/g, '')
      },
    },

    process.env.ANALYZE && visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Stub Node.js builtins that crypto-js and other deps try to import
      'fs': resolve(__dirname, 'src/shims/empty-module.ts'),
      'path': resolve(__dirname, 'src/shims/empty-module.ts'),
      'os': resolve(__dirname, 'src/shims/empty-module.ts'),
      'crypto': resolve(__dirname, 'src/shims/empty-module.ts'),
      'http': resolve(__dirname, 'src/shims/empty-module.ts'),
      'https': resolve(__dirname, 'src/shims/empty-module.ts'),
      'stream': resolve(__dirname, 'src/shims/empty-module.ts'),
      'zlib': resolve(__dirname, 'src/shims/empty-module.ts'),
      'net': resolve(__dirname, 'src/shims/empty-module.ts'),
      'tls': resolve(__dirname, 'src/shims/empty-module.ts'),
      'child_process': resolve(__dirname, 'src/shims/empty-module.ts'),
    },
  },

  envPrefix: ['VITE_', 'KIMI_'],

  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env': '{}',
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'styled-components',
      'zustand',
      'framer-motion'
    ],

    exclude: [
      'monaco-editor',
      '@monaco-editor/react',
      'sql.js',
      'chromium-bidi',
      'pac-proxy-agent',
      'get-uri',
      'puppeteer',
      'puppeteer-core',
      '@puppeteer/browsers',
      ...builtinModules,
      ...builtinModules.map(m => `node:${m}`)
    ],

  },

  worker: {
    format: 'es',
    plugins: () => [
      react()
    ],
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    chunkSizeWarningLimit: 5000,

    minify: true,

    rollupOptions: {
      // Node builtins are stubbed via resolve.alias.
      // Do NOT list them in external — that bypasses the stubs and leaves bare
      // "import 'fs'" in the bundle, which crashes in Tauri's webview.
      external: ['sql.js'],

      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? assetInfo.names?.[0] ?? ''
          const ext = name.split('.').pop() ?? ''
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },

        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',

        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-error-boundary')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/styled-components') || id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
            return 'ui-vendor';
          }
          if (id.includes('node_modules/zustand') || id.includes('node_modules/immer')) {
            return 'state';
          }
          if (id.includes('node_modules/monaco-editor')) {
            return 'monaco';
          }
          if (id.includes('node_modules/eventsource-parser') || id.includes('node_modules/isomorphic-dompurify')) {
            return 'ai-utils';
          }
        }
      },
    },

    cssCodeSplit: true,

    assetsInlineLimit: 4096,

    target: ['es2022', 'edge88', 'firefox78', 'chrome87', 'safari14'],

    reportCompressedSize: true
  },

  server: {
    port: rendererPort,
    // Dev UX: avoid hard-failing when a previous dev server is still bound to the default port.
    strictPort: false,

    cors: true,

    proxy: {
      '/api': {
        target: 'http://localhost:9001',
        changeOrigin: true,
        secure: false,
      }
    },

    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/components/Editor/index.ts',
        './src/stores/useEditorStore.ts'
      ]
    }
  },

  esbuild: {
    treeShaking: true,

    target: 'es2022',

    keepNames: mode === 'development',

    legalComments: 'none'
  },

  preview: {
    port: 3002,
    strictPort: true
  }
}));
