/* eslint-disable react-refresh/only-export-components */
import {
	type ComponentType,
	type ReactNode,
	Suspense,
	useEffect,
	useState,
} from "react";
import {
	createLazyComponent,
	createLazyHeavyComponent,
} from "../../shared/utils/lazy-loading";

// Heavy components that should be lazy loaded
export const LazyChart = createLazyHeavyComponent(
	async () => import("../../components/dashboard/DashboardMetrics"),
	"DashboardMetrics",
	200, // Minimum load time for smooth UX
);

// Form components (medium priority) - REMOVED: lead components deleted

// Dashboard components
export const LazyDashboardMetrics = createLazyComponent(
	async () => import("../../components/dashboard/DashboardMetrics"),
	"DashboardMetrics",
);

export const LazyNotificationsPanel = createLazyComponent(
	async () => import("../../components/dashboard/NotificationsPanel"),
	"NotificationsPanel",
);

// Portfolio components - REMOVED: portfolio components deleted

// 3D and animation components (heaviest)
export const LazyMeshAuroraBackground = createLazyHeavyComponent(
	async () => import("../../components/ui/mesh-aurora-background"),
	"MeshAuroraBackground",
	400,
);

export const LazyHologramContainer = createLazyHeavyComponent(
	async () => import("../../components/ui/hologram-container"),
	"HologramContainer",
	300,
);

// Loading components for different contexts
export const ComponentLoader = ({
	name,
	className = "",
}: {
	name: string;
	className?: string;
}) => (
	<div className={`animate-pulse ${className}`}>
		<div className="bg-gray-200 rounded-md h-20 w-full flex items-center justify-center">
			<div className="text-gray-400 text-sm">Loading {name}...</div>
		</div>
	</div>
);

export const ChartLoader = ({ className = "" }: { className?: string }) => (
	<div className={`animate-pulse ${className}`}>
		<div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
			<div className="space-y-2">
				<div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
				<div className="text-gray-400 text-sm">Loading chart...</div>
			</div>
		</div>
	</div>
);

export const FormLoader = ({ className = "" }: { className?: string }) => (
	<div className={`animate-pulse space-y-4 ${className}`}>
		<div className="h-4 bg-gray-200 rounded w-1/4"></div>
		<div className="h-10 bg-gray-200 rounded"></div>
		<div className="h-4 bg-gray-200 rounded w-1/3"></div>
		<div className="h-10 bg-gray-200 rounded"></div>
		<div className="h-10 bg-gray-200 rounded w-1/2"></div>
	</div>
);

// Wrapper components with proper loading states
export const LazyComponentWrapper = ({
	children,
	fallback,
	name,
}: {
	children: ReactNode;
	fallback?: ReactNode;
	name: string;
}) => (
	<Suspense fallback={fallback ?? <ComponentLoader name={name} />}>
		{children}
	</Suspense>
);

export const LazyChartWrapper = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => (
	<Suspense fallback={<ChartLoader className={className} />}>
		{children}
	</Suspense>
);

export const LazyFormWrapper = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => (
	<Suspense fallback={<FormLoader className={className} />}>
		{children}
	</Suspense>
);

// Hook for conditional component loading
export const useConditionalComponent = <T,>(
	condition: boolean,
	loader: () => Promise<{ default: ComponentType<T> }>,
	componentName: string,
) => {
	const [Component, setComponent] = useState<ComponentType<T> | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const isLoading = condition && !Component && !error;

	useEffect(() => {
		if (condition && !Component && !error) {
			loader()
				.then((module) => {
					setComponent(() => module.default);
				})
				.catch((err) => {
					setError(
						err instanceof Error ? err : new Error("Failed to load component"),
					);
					console.error(`Failed to load ${componentName}:`, err);
				});
		}
	}, [condition, Component, error, loader, componentName]);

	return { Component, isLoading, error };
};
