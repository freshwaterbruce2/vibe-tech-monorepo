// React Query hook for service monitoring
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serviceMonitor } from "../services/serviceMonitor";
import type { Service, ServiceMetrics } from "../types";

export function useServices() {
	const queryClient = useQueryClient();

	const servicesQuery = useQuery({
		queryKey: ["services"],
		queryFn: async () => serviceMonitor.getAllServices(),
		refetchInterval: 10000, // 10 seconds
		staleTime: 10000,
		retry: 2,
	});

	// Mutation for restarting services
	const restartMutation = useMutation({
		mutationFn: async (serviceName: string) =>
			serviceMonitor.restartService(serviceName),
		onSuccess: () => {
			// Invalidate and refetch services after restart
			queryClient.invalidateQueries({ queryKey: ["services"] });
		},
	});

	// Calculate service metrics
	const metrics: ServiceMetrics = calculateServiceMetrics(
		servicesQuery.data ?? [],
	);

	return {
		services: servicesQuery.data ?? [],
		metrics,
		isLoading: servicesQuery.isLoading,
		error: servicesQuery.error,
		refetch: servicesQuery.refetch,
		restartService: restartMutation.mutate,
		isRestarting: restartMutation.isPending,
	};
}

/**
 * Calculate service health metrics
 */
function calculateServiceMetrics(services: Service[]): ServiceMetrics {
	const running = services.filter((s) => s.status === "running").length;
	const stopped = services.filter((s) => s.status === "stopped").length;
	const healthy = services.filter((s) => s.health === "healthy").length;
	const degraded = services.filter((s) => s.health === "degraded").length;
	const unhealthy = services.filter((s) => s.health === "unhealthy").length;

	return {
		totalServices: services.length,
		runningServices: running,
		stoppedServices: stopped,
		healthyServices: healthy,
		degradedServices: degraded,
		unhealthyServices: unhealthy,
	};
}
