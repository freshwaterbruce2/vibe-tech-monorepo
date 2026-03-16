/* eslint-disable react-refresh/only-export-components */
/**
 * Advanced Lazy Loading Utility
 * Provides intelligent component lazy loading with preloading strategies
 */

import {
	type ComponentType,
	lazy,
	Suspense,
	useEffect,
	useRef,
	useState,
} from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { logger } from './logger';

interface LazyLoadOptions {
	fallback?: ComponentType;
	preload?: boolean;
	loadingMessage?: string;
	errorBoundary?: boolean;
}

interface LazyComponentProps {
	component: ComponentType;
	fallback?: ComponentType;
	loadingMessage?: string;
}

/**
 * Enhanced lazy loading with preloading support
 */
export function createLazyComponent<
	T extends ComponentType<Record<string, unknown>>,
>(
	importFn: () => Promise<{ default: T }>,
	options: LazyLoadOptions = {},
) {
	const LazyComponent = lazy(importFn);

	// Optional preloading
	if (options.preload) {
		// Preload after initial page load
		setTimeout(() => {
			importFn().catch((error) => {
				logger.warn('Component preload failed', {
					component: 'LazyLoader',
					error: error.message,
				});
			});
		}, 100);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const WrappedComponent = (props: any) => (
		<Suspense
			fallback={
				options.fallback ? (
					<options.fallback />
				) : (
					<div className="flex items-center justify-center min-h-[200px]">
						<LoadingSpinner size="lg" />
						{options.loadingMessage && (
							<p className="ml-3 text-sm text-gray-600">
								{options.loadingMessage}
							</p>
						)}
					</div>
				)
			}
		>
			<LazyComponent {...props} />
		</Suspense>
	);

	return WrappedComponent;
}

/**
 * Intersection Observer-based lazy loading for components
 */
export const LazyIntersectionComponent = ({
	component: LazyComp,
	fallback: Fallback,
	loadingMessage: _loadingMessage = 'Loading component...',
}: LazyComponentProps) => {
	const [isVisible, setIsVisible] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current || hasLoaded) {
return;
}

		const observer = new IntersectionObserver(
			(entries) => {
				const firstEntry = entries[0];
				if (firstEntry && firstEntry.isIntersecting) {
					setIsVisible(true);
					setHasLoaded(true);
					observer.disconnect();

					logger.debug('Lazy component loaded via intersection', {
						component: 'LazyIntersectionComponent',
						componentName: LazyComp.name || 'Anonymous',
					});
				}
			},
			{
				threshold: 0.1,
				rootMargin: '100px', // Start loading 100px before component is visible
			},
		);

		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [LazyComp.name, hasLoaded]);

	return (
		<div ref={containerRef} className="min-h-[50px]">
			{isVisible && <LazyComp />}
			{!isVisible && Fallback && <Fallback />}
			{!isVisible && !Fallback && (
				<div className="flex items-center justify-center py-8">
					<div className="animate-pulse bg-gray-200 rounded-lg w-full h-32" />
				</div>
			)}
		</div>
	);
};

/**
 * Preload critical components
 */
export const preloadCriticalComponents = () => {
	const criticalImports = [
		() => import('../components/search/SearchResults'),
		() => import('../components/booking/BookingFlow'),
		() => import('../components/payment/SquarePaymentForm'),
	];

	logger.info('Preloading critical components', {
		component: 'LazyLoader',
		count: criticalImports.length,
	});

	criticalImports.forEach((importFn, index) => {
		// Stagger preloading to avoid blocking the main thread
		setTimeout(() => {
			importFn().catch((error) => {
				logger.warn('Critical component preload failed', {
					component: 'LazyLoader',
					index,
					error: error.message,
				});
			});
		}, index * 50);
	});
};

/**
 * Route-based code splitting helper
 */
export const createLazyRoute = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	importFn: () => Promise<{ default: ComponentType<any> }>,
	routeName: string,
) => {
	return createLazyComponent(importFn, {
		loadingMessage: `Loading ${routeName}...`,
		preload: false, // Don't preload routes by default
	});
};
