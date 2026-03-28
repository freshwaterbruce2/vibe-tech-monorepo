import react from '@vitejs/plugin-react'
import { builtinModules } from 'module'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'

const rendererPort = Number(process.env.VIBE_RENDERER_PORT ?? process.env.VITE_PORT ?? 5174)

export default defineConfig({
  // @monaco-editor/react handles workers automatically - NO plugin needed
  base: process.env.NODE_ENV === 'production' ? './' : '/',

  plugins: [
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
        'sql.js',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`)
      ],

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

      // Rolldown handles treeshaking automatically; Monaco side-effects
      // are preserved by default in Vite 8.
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
