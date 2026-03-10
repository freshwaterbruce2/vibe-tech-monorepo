import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

interface CoverageMetrics {
	linesCovered: number;
	linesTotal: number;
	statementsCovered: number;
	statementsTotal: number;
	branchesCovered: number;
	branchesTotal: number;
	functionsCovered: number;
	functionsTotal: number;
	coveragePercent: number;
}

interface ProjectCoverage {
	projectName: string;
	timestamp: string;
	metrics: CoverageMetrics;
}

interface CoverageTrend {
	projectName: string;
	dataPoints: Array<{
		timestamp: string;
		coveragePercent: number;
	}>;
}

interface DetailedCoverage extends ProjectCoverage {
	linesPercent: number;
	statementsPercent: number;
	branchesPercent: number;
	functionsPercent: number;
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = "http://localhost:5177/api";

// ============================================================================
// Hooks
// ============================================================================

/**
 * GET /api/coverage/latest
 * Fetch current coverage for all projects
 */
export function useCoverage() {
	return useQuery<ProjectCoverage[], Error>({
		queryKey: ["coverage", "latest"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/coverage/latest`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch coverage: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 120000, // 2 minutes
		staleTime: 60000, // 1 minute
	});
}

/**
 * GET /api/coverage/trends?days=30
 * Fetch historical coverage trends
 */
export function useCoverageTrends(days = 30) {
	return useQuery<CoverageTrend[], Error>({
		queryKey: ["coverage", "trends", days],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/coverage/trends?days=${days}`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch coverage trends: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 300000, // 5 minutes
		staleTime: 120000, // 2 minutes
	});
}

/**
 * GET /api/coverage/details/:project
 * Fetch detailed coverage metrics for a specific project
 */
export function useCoverageDetails(projectName: string) {
	return useQuery<DetailedCoverage | null, Error>({
		queryKey: ["coverage", "details", projectName],
		queryFn: async () => {
			const res = await fetch(
				`${API_BASE_URL}/coverage/details/${encodeURIComponent(projectName)}`,
			);

			if (res.status === 404) {
				return null; // Project not found
			}

			if (!res.ok) {
				throw new Error(
					`Failed to fetch coverage details: ${res.status} ${res.statusText}`,
				);
			}

			return res.json();
		},
		enabled: !!projectName, // Only run if projectName is provided
		refetchInterval: 180000, // 3 minutes
		staleTime: 90000, // 1.5 minutes
	});
}
