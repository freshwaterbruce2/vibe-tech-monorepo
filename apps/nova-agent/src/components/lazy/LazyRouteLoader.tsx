/* eslint-disable react-refresh/only-export-components */
import { type ReactNode, Suspense, useEffect, useState } from "react";
import {
	createLazyRoute,
	globalPreloader,
} from "../../shared/utils/lazy-loading";
import { usePerformanceMeasure } from "../../shared/utils/performance-monitor";

// Enhanced loading component with skeleton
const EnhancedPageLoader = ({ routeName }: { routeName: string }) => {
	usePerformanceMeasure(`route-loading:${routeName}`);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="flex flex-col items-center space-y-4 max-w-sm w-full">
				{/* Animated loader */}
				<div className="relative">
					<div className="h-16 w-16 rounded-full border-4 border-t-[color:var(--c-purple)] border-r-transparent border-b-[color:var(--c-cyan)] border-l-transparent animate-spin"></div>
					<div
						className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-[color:var(--c-cyan)] animate-spin animate-reverse"
						style={{ animationDelay: "0.5s" }}
					></div>
				</div>

				{/* Loading text */}
				<div className="text-center space-y-2">
					<p className="text-aura-accent font-medium">Loading {routeName}...</p>
					<div className="flex space-x-1 justify-center">
						<div className="w-2 h-2 bg-aura-accent rounded-full animate-bounce"></div>
						<div
							className="w-2 h-2 bg-aura-accent rounded-full animate-bounce"
							style={{ animationDelay: "0.1s" }}
						></div>
						<div
							className="w-2 h-2 bg-aura-accent rounded-full animate-bounce"
							style={{ animationDelay: "0.2s" }}
						></div>
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
export const LazyDashboard = createLazyRoute(
	async () => import("../../pages/Dashboard"),
	"Dashboard",
	{
		priority: "high",
		preload: true,
	},
);

export const LazyChatInterface = createLazyRoute(
	async () => import("../../pages/ChatInterface"),
	"ChatInterface",
	{
		priority: "high",
	},
);

export const LazyContextGuide = createLazyRoute(
	async () => import("../../pages/ContextGuide"),
	"ContextGuide",
	{
		priority: "medium",
	},
);

export const LazyDocumentAnalysis = createLazyRoute(
	async () => import("../../pages/DocumentAnalysis"),
	"DocumentAnalysis",
	{
		priority: "medium",
	},
);

// Demo and preview pages (lowest priority)
export const LazyPalettePreview = createLazyRoute(
	async () => import("../../pages/PalettePreview"),
	"PalettePreview",
	{
		priority: "low",
	},
);

export const LazyFuturisticDemo = createLazyRoute(
	async () => import("../../pages/FuturisticDemo"),
	"FuturisticDemo",
	{
		priority: "low",
	},
);

// Route wrapper with suspense and error boundary
// Static import mapping for route preloading
const routeImports: Record<string, () => Promise<unknown>> = {
	Dashboard: async () => import("../../pages/Dashboard"),
	NovaDashboard: async () => import("../../pages/NovaDashboard"),
	ChatInterface: async () => import("../../pages/ChatInterface"),
	ContextGuide: async () => import("../../pages/ContextGuide"),
	Settings: async () => import("../../pages/Settings"),
	DocumentAnalysis: async () => import("../../pages/DocumentAnalysis"),
	PalettePreview: async () => import("../../pages/PalettePreview"),
	FuturisticDemo: async () => import("../../pages/FuturisticDemo"),
};

export const LazyRouteWrapper = ({
	children,
	routeName,
	preloadRoutes = [],
}: {
	children: ReactNode;
	routeName: string;
	preloadRoutes?: string[];
}) => {
	// Set up predictive preloading
	useEffect(() => {
		globalPreloader.recordAction(`route:${routeName}`);

		// Register preload callbacks for related routes
		preloadRoutes.forEach((route) => {
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
	const [loadTime, setLoadTime] = useState<number | null>(null);

	useEffect(() => {
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
// @ts-nocheck
