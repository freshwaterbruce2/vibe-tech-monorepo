module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173'],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-dev-shm-usage'
      }
    },
    assert: {
      assertions: {
        // PWA specific requirements
        'categories:pwa': ['error', { minScore: 0.9 }],
        'service-worker': 'error',
        'installable-manifest': 'error',
        'splash-screen': 'warn',
        'themed-omnibox': 'warn',
        'content-width': 'error',
        'viewport': 'error',
        
        // Performance for PWA
        'categories:performance': ['warn', { minScore: 0.85 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        
        // Accessibility
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'color-contrast': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'aria-allowed-attr': 'error',
        'aria-required-attr': 'error',
        'aria-roles': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        
        // Best practices for shipping/logistics app
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'uses-https': 'error',
        'no-vulnerable-libraries': 'error',
        'is-on-https': 'error',
        'geolocation-on-start': 'warn', // May be needed for shipping
        'notification-on-start': 'warn', // May be needed for updates
        
        // SEO
        'categories:seo': ['warn', { minScore: 0.85 }],
        'meta-description': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        
        // Offline functionality (critical for PWA)
        'works-offline': 'warn',
        'offline-start-url': 'warn',
        
        // Network resilience
        'load-fast-enough-for-pwa': 'warn',
        'redirects-http': 'error'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};