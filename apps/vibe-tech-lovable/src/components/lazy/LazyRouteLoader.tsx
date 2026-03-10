import React, { Suspense } from 'react';
import { createLazyRoute, globalPreloader } from '../../../../shared/utils/lazy-loading';
import { usePerformanceMeasure } from '../../../../shared/utils/performance-monitor';

// Enhanced loading component with skeleton
const EnhancedPageLoader = ({ routeName }: { routeName: string }) => {
  usePerformanceMeasure(`route-loading:${routeName}`);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4 max-w-sm w-full">
        {/* Animated loader */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-t-[color:var(--c-purple)] border-r-transparent border-b-[color:var(--c-cyan)] border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-[color:var(--c-cyan)] animate-spin animate-reverse" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <p className="text-aura-accent font-medium">Loading {routeName}...</p>
          <div className="flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-aura-accent rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-aura-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-aura-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Skeleton content */}
        <div className="w-full space-y-3 mt-8">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
        </div>
      </div>
    </div>
  );
};

// Lazy route components with intelligent preloading
export const LazyPortfolio = createLazyRoute(
  () => import('../../pages/Portfolio'),
  'Portfolio',
  { priority: 'high', preload: true }
);

export const LazyProjectDetail = createLazyRoute(
  () => import('../../pages/ProjectDetail'),
  'ProjectDetail',
  { priority: 'high', dependencies: ['Portfolio'] }
);

export const LazyContact = createLazyRoute(
  () => import('../../pages/Contact'),
  'Contact',
  { priority: 'high', preload: true }
);

export const LazyBlog = createLazyRoute(
  () => import('../../pages/Blog'),
  'Blog',
  { priority: 'medium' }
);

export const LazyBlogPostPage = createLazyRoute(
  () => import('../../pages/public/BlogPostPage'),
  'BlogPost',
  { priority: 'medium', dependencies: ['Blog'] }
);

export const LazyBlogEditor = createLazyRoute(
  () => import('../../pages/BlogEditor'),
  'BlogEditor',
  { priority: 'low' }
);

export const LazyPricing = createLazyRoute(
  () => import('../../pages/Pricing'),
  'Pricing',
  { priority: 'high' }
);

export const LazyDashboard = createLazyRoute(
  () => import('../../pages/Dashboard'),
  'Dashboard',
  { priority: 'medium' }
);

export const LazyServices = createLazyRoute(
  () => import('../../pages/Services'),
  'Services',
  { priority: 'high' }
);

export const LazyTools = createLazyRoute(
  () => import('../../pages/Tools'),
  'Tools',
  { priority: 'medium' }
);

export const LazyResources = createLazyRoute(
  () => import('../../pages/Resources'),
  'Resources',
  { priority: 'low' }
);

export const LazyAbout = createLazyRoute(
  () => import('../../pages/About'),
  'About',
  { priority: 'medium' }
);

// Demo and preview pages (lowest priority)
export const LazyPalettePreview = createLazyRoute(
  () => import('../../pages/PalettePreview'),
  'PalettePreview',
  { priority: 'low' }
);

export const LazyFuturisticDemo = createLazyRoute(
  () => import('../../pages/FuturisticDemo'),
  'FuturisticDemo',
  { priority: 'low' }
);

// Route wrapper with suspense and error boundary
// Static import mapping for route preloading
const routeImports: Record<string, () => Promise<any>> = {
  'Portfolio': () => import('../../pages/Portfolio'),
  'ProjectDetail': () => import('../../pages/ProjectDetail'),
  'Contact': () => import('../../pages/Contact'),
  'Blog': () => import('../../pages/Blog'),
  'BlogPost': () => import('../../pages/public/BlogPostPage'),
  'BlogEditor': () => import('../../pages/BlogEditor'),
  'Pricing': () => import('../../pages/Pricing'),
  'Dashboard': () => import('../../pages/Dashboard'),
  'Services': () => import('../../pages/Services'),
  'Tools': () => import('../../pages/Tools'),
  'Resources': () => import('../../pages/Resources'),
  'About': () => import('../../pages/About'),
  'PalettePreview': () => import('../../pages/PalettePreview'),
  'FuturisticDemo': () => import('../../pages/FuturisticDemo'),
};

export const LazyRouteWrapper: React.FC<{
  children: React.ReactNode;
  routeName: string;
  preloadRoutes?: string[];
}> = ({ children, routeName, preloadRoutes = [] }) => {
  // Set up predictive preloading
  React.useEffect(() => {
    globalPreloader.recordAction(`route:${routeName}`);

    // Register preload callbacks for related routes
    preloadRoutes.forEach(route => {
      globalPreloader.registerPreloadCallback(`route:${route}`, () => {
        // Preload related routes based on user behavior
        const importFn = routeImports[route];
        if (importFn) {
          importFn().catch(() => {
            // Preload failed, component will load on demand
          });
        }
      });
    });
  }, [routeName, preloadRoutes]);

  return (
    <Suspense fallback={<EnhancedPageLoader routeName={routeName} />}>
      {children}
    </Suspense>
  );
};

// Hook for route-specific performance tracking
export const useRoutePerformance = (routeName: string) => {
  const [loadTime, setLoadTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    const startTime = performance.now();

    // Measure route load time
    const measureLoadTime = () => {
      const endTime = performance.now();
      setLoadTime(endTime - startTime);
    };

    // Use RAF to ensure DOM is ready
    requestAnimationFrame(measureLoadTime);

    // Track route view
    globalPreloader.recordAction(`route-view:${routeName}`);
  }, [routeName]);

  return { loadTime };
};
