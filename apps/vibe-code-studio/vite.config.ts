import react from '@vitejs/plugin-react'
import { builtinModules } from 'module'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'

const rendererPort = Number(process.env.VIBE_RENDERER_PORT ?? process.env.VITE_PORT ?? 5174)

export default defineConfig({
  // Electron: No base path needed (uses file:// protocol)
  // @monaco-editor/react handles workers automatically - NO plugin needed
  base: process.env.NODE_ENV === 'production' ? './' : '/',

  plugins: [
    // Intercept 'electron' module at ALL levels:
    // 1. resolveId: redirect bare 'electron' imports to our stub
    // 2. load: catch any resolved path that points to electron
    // 3. configureServer: middleware to intercept pre-bundled .vite/deps/electron.js
    {
      name: 'stub-electron',
      enforce: 'pre',
      resolveId(id: string) {
        if (id === 'electron') {
          return '\0virtual:electron-stub';
        }
      },
      load(id: string) {
        if (id === '\0virtual:electron-stub' || id.includes('node_modules/electron/') || id.includes('node_modules\\electron\\') || id.endsWith('/electron.js')) {
          return 'export default {}; export const ipcRenderer = { invoke: async () => null, on: () => {}, send: () => {} }; const electron = { app: {}, dialog: {}, shell: {}, ipcRenderer: { invoke: async () => null, on: () => {}, send: () => {} } }; export { electron }; module.exports = electron;';
        }
      },
      configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url && req.url.includes('/electron.js')) {
            const depPath = req.url.includes('.vite/deps/electron');
            if (depPath) {
              res.setHeader('Content-Type', 'application/javascript');
              res.end('export default {};');
              return;
            }
          }
          next();
        });
      },
    },
    react({
      // Optimize for React 19 with automatic JSX runtime
      jsxRuntime: 'automatic',
      // Babel optimizations
      babel: {
        plugins: [
          // Future: React Compiler will go here when stable
        ]
      }
    }),

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
      // Stub 'electron' for browser/Tauri — prevents dev server crash from
      // node_modules/electron/index.js trying to require('path')
      'electron': resolve(__dirname, 'src/stubs/electron.ts'),
    },
  },

  envPrefix: ['VITE_', 'KIMI_'],

  define: {
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
      'electron',
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

    // Stub 'electron' at the esbuild pre-bundler level — the Vite plugin
    // pipeline doesn't intercept dep optimization (esbuild runs separately)
    esbuildOptions: {
      plugins: [
        {
          name: 'stub-electron',
          setup(build) {
            build.onResolve({ filter: /^electron$/ }, () => ({
              path: 'electron',
              namespace: 'stub-electron',
            }));
            build.onLoad({ filter: /.*/, namespace: 'stub-electron' }, () => ({
              contents: 'module.exports = {};',
              loader: 'js',
            }));
          },
        },
      ],
    },
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
    sourcemap: process.env.NODE_ENV === 'development',

    chunkSizeWarningLimit: 1000,

    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },

      external: [
        'electron',
        'sql.js',
        'better-sqlite3',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`)
      ],

      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },

        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',

        manualChunks: {
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            'react-error-boundary'
          ],

          'ui-vendor': [
            'styled-components',
            'framer-motion',
            'lucide-react'
          ],

          'state': [
            'zustand',
            'immer'
          ],

          'monaco': [
            'monaco-editor'
          ],

          'ai-utils': [
            'eventsource-parser',
            'isomorphic-dompurify'
          ]
        }
      },

      treeshake: {
        // Monaco's standalone editor bootstraps critical services through
        // side-effect-only imports. Stripping those imports breaks model
        // creation in production with missing service registrations.
        moduleSideEffects: (id) =>
          id.includes('node_modules/monaco-editor/')
          || id.includes('node_modules\\monaco-editor\\'),
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
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
        './src/components/Editor.tsx',
        './src/stores/useEditorStore.ts'
      ]
    }
  },

  esbuild: {
    treeShaking: true,

    target: 'es2022',

    keepNames: process.env.NODE_ENV === 'development',

    legalComments: 'none'
  },

  preview: {
    port: 3002,
    strictPort: true
  }
});
