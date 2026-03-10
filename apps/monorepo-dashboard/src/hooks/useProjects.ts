// React Query hook for Nx workspace projects
import { useQuery } from "@tanstack/react-query";
import { nxService } from "../services/nxService";
import type { Project, ProjectStatus, WorkspaceMetrics } from "../types";

export function useProjects(filter?: string) {
	const projectsQuery = useQuery({
		queryKey: ["projects", filter],
		queryFn: async () => nxService.getWorkspaceProjects(filter),
		refetchInterval: 10000, // 10 seconds
		staleTime: 10000,
		retry: 3,
	});

	const affectedQuery = useQuery({
		queryKey: ["projects", "affected"],
		queryFn: async () => nxService.getAffectedProjects(),
		refetchInterval: 30000, // 30 seconds
		staleTime: 30000,
		retry: 2,
	});

	const cacheStatsQuery = useQuery({
		queryKey: ["nx", "cache"],
		queryFn: async () => nxService.getCacheStats(),
		refetchInterval: 30000, // 30 seconds
		staleTime: 30000,
	});

	// Categorize projects
	const categorizedProjects = projectsQuery.data
		? nxService.categorizeProjects(projectsQuery.data)
		: {};

	// Calculate workspace metrics
	const metrics: WorkspaceMetrics = calculateMetrics(projectsQuery.data ?? {});

	const isLoading = projectsQuery.isLoading || affectedQuery.isLoading;
	const error = projectsQuery.error ?? affectedQuery.error;

	return {
		projects: projectsQuery.data ?? {},
		categorizedProjects,
		affectedProjects: affectedQuery.data,
		cacheStats: cacheStatsQuery.data,
		metrics,
		isLoading,
		error,
		refetch: () => {
			projectsQuery.refetch();
			affectedQuery.refetch();
			cacheStatsQuery.refetch();
		},
	};
}

/**
 * Calculate workspace health metrics
 */
function calculateMetrics(projects: Record<string, Project>): WorkspaceMetrics {
	const projectArray = Object.values(projects);

	// Mock status calculation - would need actual health checks
	const statusCounts = projectArray.reduce(
		(acc, project) => {
			const status = determineProjectStatus(project);
			if (status === "healthy") acc.healthy++;
			else if (status === "warning") acc.warning++;
			else acc.critical++;
			return acc;
		},
		{ healthy: 0, warning: 0, critical: 0 },
	);

	return {
		totalProjects: projectArray.length,
		healthyProjects: statusCounts.healthy,
		warningProjects: statusCounts.warning,
		criticalProjects: statusCounts.critical,
		totalDependencies: projectArray.reduce(
			(sum, p) => sum + (p.implicitDependencies?.length ?? 0),
			0,
		),
		configIssues: 0, // Would need config drift detection
	};
}

/**
 * Determine project health status
 */
function determineProjectStatus(_project: Project): ProjectStatus {
	// Simplified status determination
	// In real implementation, would check:
	// - Build status
	// - Test results
	// - Lint errors
	// - Type errors

	// For now, all projects are healthy (mock)
	return "healthy";
}
