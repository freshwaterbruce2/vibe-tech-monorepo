import React, { Suspense } from 'react';
import { createLazyComponent, createLazyHeavyComponent } from '../../../shared/utils/lazy-loading';

// Heavy components that should be lazy loaded
export const LazyChart = createLazyHeavyComponent(
  () => import('../../components/dashboard/DashboardMetrics'),
  'DashboardMetrics',
  200 // Minimum load time for smooth UX
);

export const LazyRecharts = createLazyHeavyComponent(
  () => import('recharts').then(module => ({ default: module.ResponsiveContainer })),
  'Recharts',
  150
);

export const LazyReactThreeFiber = createLazyHeavyComponent(
  () => import('@react-three/fiber'),
  'ReactThreeFiber',
  300
);

export const LazyReactThreeDrei = createLazyHeavyComponent(
  () => import('@react-three/drei'),
  'ReactThreeDrei',
  200
);

// Form components (medium priority)
export const LazyAddLeadForm = createLazyComponent(
  () => import('../../components/lead/AddLeadForm'),
  'AddLeadForm'
);

export const LazyContactForm = createLazyComponent(
  () => import('../../components/contact/ContactForm'),
  'ContactForm'
);

// Blog components
export const LazyBlogEditor = createLazyComponent(
  () => import('../../components/blog/BlogEditor'),
  'BlogEditor'
);

export const LazyBlogPostsList = createLazyComponent(
  () => import('../../components/blog/BlogPostsList'),
  'BlogPostsList'
);

// Dashboard components
export const LazyDashboardMetrics = createLazyComponent(
  () => import('../../components/dashboard/DashboardMetrics'),
  'DashboardMetrics'
);

export const LazyDashboardLeads = createLazyComponent(
  () => import('../../components/dashboard/DashboardLeads'),
  'DashboardLeads'
);

export const LazyNotificationsPanel = createLazyComponent(
  () => import('../../components/dashboard/NotificationsPanel'),
  'NotificationsPanel'
);

// Portfolio components
export const LazyProjectGrid = createLazyComponent(
  () => import('../../components/portfolio/ProjectGrid'),
  'ProjectGrid'
);

export const LazyProjectCard = createLazyComponent(
  () => import('../../components/portfolio/ProjectCard'),
  'ProjectCard'
);

// 3D and animation components (heaviest)
export const LazyMeshAuroraBackground = createLazyHeavyComponent(
  () => import('../../components/ui/mesh-aurora-background'),
  'MeshAuroraBackground',
  400
);

export const LazyHologramContainer = createLazyHeavyComponent(
  () => import('../../components/ui/hologram-container'),
  'HologramContainer',
  300
);

export const LazyParticleNetwork = createLazyHeavyComponent(
  () => import('../../components/ui/particle-network'),
  'ParticleNetwork',
  350
);

// Loading components for different contexts
export const ComponentLoader: React.FC<{ name: string; className?: string }> = ({ 
  name, 
  className = '' 
}) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded-md h-20 w-full flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading {name}...</div>
    </div>
  </div>
);

export const ChartLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
      <div className="space-y-2">
        <div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-gray-400 text-sm">Loading chart...</div>
      </div>
    </div>
  </div>
);

export const FormLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse space-y-4 ${className}`}>
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
    <div className="h-10 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// Wrapper components with proper loading states
export const LazyComponentWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name: string;
}> = ({ children, fallback, name }) => (
  <Suspense fallback={fallback || <ComponentLoader name={name} />}>
    {children}
  </Suspense>
);

export const LazyChartWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <Suspense fallback={<ChartLoader className={className} />}>
    {children}
  </Suspense>
);

export const LazyFormWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <Suspense fallback={<FormLoader className={className} />}>
    {children}
  </Suspense>
);

// Hook for conditional component loading
export const useConditionalComponent = <T,>(
  condition: boolean,
  loader: () => Promise<{ default: React.ComponentType<T> }>,
  componentName: string
) => {
  const [Component, setComponent] = React.useState<React.ComponentType<T> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    if (condition && !Component && !isLoading) {
      setIsLoading(true);
      setError(null);
      
      loader()
        .then(module => {
          setComponent(() => module.default);
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error('Failed to load component'));
          console.error(`Failed to load ${componentName}:`, err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [condition, Component, isLoading, loader, componentName]);
  
  return { Component, isLoading, error };
};