/**
 * Lazy component instances, preload strategies, and bundle utilities.
 * Kept out of LazyComponents.tsx so Fast Refresh works
 * (react-refresh/only-export-components) — this .ts module holds the
 * non-component exports.
 */
import { lazyRetry } from '../utils/lazyRetry';

// Lazy-loaded heavy components (retry once on Vite/HMR fetch failure)
export const LazyAIChat = lazyRetry(() => import('./AIChat'));

export const LazySettings = lazyRetry(() => import('./Settings'));

export const LazyCommandPalette = lazyRetry(() => import('./CommandPalette'));

// Route-based code splitting
export const routes = {
  welcome: lazyRetry(() => import('../pages/WelcomePage')),
};

// Preload functions map
const preloadMap = {
  aiChat: () => import('./AIChat'),
  settings: () => import('./Settings'),
  commandPalette: () => import('./CommandPalette'),
};

// Preload strategies for better UX
export const preloadStrategies = {
  // Preload on hover
  preloadOnHover: (componentName: keyof typeof preloadMap) => {
    const preloadFn = preloadMap[componentName];
    if (preloadFn) {
      preloadFn();
    }
  },

  // Preload on idle
  preloadOnIdle: (componentName: keyof typeof preloadMap) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const preloadFn = preloadMap[componentName];
        if (preloadFn) {
          preloadFn();
        }
      });
    }
  },

  // Preload with intersection observer
  preloadOnVisible: (element: HTMLElement, componentName: keyof typeof preloadMap) => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          const preloadFn = preloadMap[componentName];
          if (preloadFn) {
            preloadFn();
          }
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  },
};

// Bundle size optimization utilities
export const bundleOptimization = {
  // Load heavy libraries only when needed
  loadMonaco: () => import('monaco-editor'),

  // Load chart library on demand (when installed)
  loadCharts: () => {
    // Placeholder - install recharts when needed
    // return import('recharts')
    return Promise.resolve(null);
  },

  // Load markdown parser on demand
  loadMarkdown: () => import('marked'),
};
