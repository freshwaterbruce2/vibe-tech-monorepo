
// Service Worker Registration with PWA Metrics
import { pwaMetrics } from '../shared/utils/pwa-metrics.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('SW registered: ', registration);
      
      // Initialize PWA metrics
      pwaMetrics.initialize();
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('New content is available; please refresh.');
                // Show update notification to user
                dispatchEvent(new CustomEvent('sw-update-available'));
              }
            }
          });
        }
      });
      
    } catch (error) {
      console.log('SW registration failed: ', error);
    }
  });
}

export {};
