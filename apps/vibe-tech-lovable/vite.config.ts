import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Public directory (migrated from C:\dev\public to app-specific location 2026-01-24)
  publicDir: './public',

  server: {
    host: "::",
    port: 8080,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9001',
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: true
    }
  },
  plugins: [
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      selfDestroying: true,
      workbox: {
        disableDevLogs: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB (increased from default 2 MB)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/cdn-cgi/speculation',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://www.googletagmanager.com' ||
              url.origin === 'https://www.google-analytics.com',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /.*\.(jpg|jpeg|png|webp|avif|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          }
        ],
        cleanupOutdatedCaches: true
      },
      manifest: {
        name: 'vibe-tech-lovable PWA',
        short_name: 'vibe-tech-lovable',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/'
      },
      devOptions: {
        enabled: true
      }
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2022',
    minify: 'terser',
    sourcemap: mode === 'production',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          } else if (/woff2?|eot|ttf|otf/i.test(extType)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    chunkSizeWarningLimit: 500, // Warn early for large chunks (performance optimization)
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion'
    ],
    exclude: ['three'] // Exclude heavy 3D libraries from pre-bundling
  }
}));
