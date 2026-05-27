/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Sentry plugin disabled - uncomment and configure to enable
    // ...(process.env.NODE_ENV === 'production' && process.env.VITE_SENTRY_DSN ? [sentryVitePlugin({
    //   org: process.env.SENTRY_ORG || "your-org",
    //   project: process.env.SENTRY_PROJECT || "shipping-pwa",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    //
    //   // Configure source maps upload
    //   sourcemaps: {
    //     assets: './dist/**',
    //     ignore: ['node_modules/**'],
    //   },
    //
    //   // Configure release settings
    //   release: {
    //     name: process.env.VITE_SENTRY_RELEASE || 'shipping-pwa@1.0.0',
    //     cleanArtifacts: true,
    //     setCommits: {
    //       auto: true,
    //     },
    //   },
    //
    //   // Only upload source maps, don't include them in build
    //   silent: true,
    // })] : []),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,avif}'],
        // Increased precache limit for better offline experience
        maximumFileSizeToCacheInBytes: 3000000, // 3MB
        // Advanced runtime caching strategies
        runtimeCaching: [
          // API Endpoints - Network First with extensive offline fallback
          {
            urlPattern: /^https:\/\/api\.(deepseek|openai)\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              networkTimeoutSeconds: 10
            }
          },
          // Images - Cache First with WebP/AVIF support
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // CSS and JS assets - Stale While Revalidate
          {
            urlPattern: /\.(?:css|js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Google Fonts optimization
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // CDN Resources - Cache First
          {
            urlPattern: /^https:\/\/cdn\..*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        // Advanced offline handling
        navigateFallback: '/offline.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        navigateFallbackDenylist: [/^\/api\//],
        // Skip waiting and claim clients immediately
        skipWaiting: true,
        clientsClaim: true
      },
      // Enhanced PWA features
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'offline.html',
        'icons/*.png'
      ],
      manifest: {
        name: 'Walmart DC 8980 Shipping Department',
        short_name: 'DC8980 Shipping',
        description: 'Advanced PWA for door scheduling and pallet tracking with offline capabilities',
        theme_color: '#0071CE',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'business'],
        // Enhanced PWA features
        display_override: ['window-controls-overlay', 'standalone'],
        prefer_related_applications: false,
        // Advanced icon configuration
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        // Web Share Target API
        share_target: {
          action: '/share-target/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        // Protocol handlers
        protocol_handlers: [
          {
            protocol: 'web+shipping',
            url: '/handle-protocol?type=%s'
          }
        ]
      },
      // Development settings
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
    hmr: {
      overlay: true
    }
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand'
    ],
    exclude: [
      '@capacitor/android',
      '@capacitor/ios',
      '@capacitor/cli'
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'production',
    target: 'es2022', // Modern browsers for better performance
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn']
      }
    },
    chunkSizeWarningLimit: 1000, // 1MB chunks
    rollupOptions: {
      external: [
        // Exclude Capacitor dependencies from build since they're runtime-only for web
        '@capacitor/android',
        '@capacitor/ios',
        '@capacitor/cli'
      ],
      output: {
        manualChunks: {
          // Core React
          vendor: ['react', 'react-dom'],

          // Router and forms
          router: ['react-router-dom', 'react-hook-form', 'zod'],

          // State management and data fetching
          query: ['@tanstack/react-query', 'zustand'],

          // Animation and UI motion
          motion: ['framer-motion'],

          // Firebase services (will be lazy loaded)
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/analytics'
          ],

          // Error monitoring (will be lazy loaded)
          sentry: ['@sentry/react'],

          // Payment processing (will be lazy loaded)
          square: ['square'],

          // Radix UI Core components (frequently used)
          'radix-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-slot'
          ],

          // Radix UI Form components
          'radix-forms': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-select',
            '@radix-ui/react-label'
          ],

          // Radix UI Layout components
          'radix-layout': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-aspect-ratio'
          ],

          // Radix UI Overlay components
          'radix-overlays': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-menubar',
            '@radix-ui/react-toast'
          ],

          // Utility libraries
          utils: [
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'cmdk',
            'date-fns',
            'lucide-react'
          ],

          // PWA and mobile specific (Capacitor excluded from web build)
          pwa: [
            'idb'
          ],

          // Chart and visualization (lazy loaded)
          charts: ['recharts', 'embla-carousel-react'],

          // Development and other utilities
          misc: [
            'sonner',
            'vaul',
            'next-themes',
            'react-day-picker',
            'react-resizable-panels',
            'input-otp',
            'tailwindcss-animate'
          ]
        },

        // Optimize chunk and asset naming
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
      },
    },
  },

  // Vitest Testing Configuration
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/vite-env.d.ts',
        'src/__tests__/mocks/**',
        'src/main.tsx',
        '**/*.d.ts',
        'coverage/**',
        'dist/**',
        '**/*.config.{js,ts}',
        'src/test-comment.js'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    deps: {
      inline: ['@testing-library/jest-dom']
    },
    pool: 'threads'
  },
})
