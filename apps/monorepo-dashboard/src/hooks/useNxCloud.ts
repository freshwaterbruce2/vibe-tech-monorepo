import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

interface NxCloudBuild {
	id: string;
	timestamp: string;
	branch: string;
	status: "success" | "failure" | "running";
	durationMs: number;
	cacheHitRate: number;
	tasksExecuted: number;
	tasksCached: number;
}

interface NxCloudStatus {
	connected: boolean;
	authenticationRequired: boolean;
	lastSync: string | null;
	buildsInDatabase: number;
	error?: string;
}

interface NxCloudPerformance {
	avgBuildTimeMs: number;
	avgCacheHitRate: number;
	totalBuilds: number;
	successRate: number;
	fastestBuildMs: number;
	slowestBuildMs: number;
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = "http://localhost:5177/api";

// ============================================================================
// Hooks
// ============================================================================

/**
 * GET /api/nx-cloud/status
 * Fetch Nx Cloud connection status and metadata
 */
export function useNxCloudStatus() {
	return useQuery<NxCloudStatus, Error>({
		queryKey: ["nx-cloud", "status"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/nx-cloud/status`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch Nx Cloud status: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 60000, // 1 minute
		staleTime: 30000, // 30 seconds
	});
}

/**
 * GET /api/nx-cloud/builds?limit=10
 * Fetch recent Nx Cloud builds
 */
export function useNxCloudBuilds(limit = 10) {
	return useQuery<NxCloudBuild[], Error>({
		queryKey: ["nx-cloud", "builds", limit],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/nx-cloud/builds?limit=${limit}`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch Nx Cloud builds: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 120000, // 2 minutes
		staleTime: 60000, // 1 minute
	});
}

/**
 * GET /api/nx-cloud/performance?days=7
 * Fetch Nx Cloud performance metrics over time
 */
export function useNxCloudPerformance(days = 7) {
	return useQuery<NxCloudPerformance, Error>({
		queryKey: ["nx-cloud", "performance", days],
		queryFn: async () => {
			const res = await fetch(
				`${API_BASE_URL}/nx-cloud/performance?days=${days}`,
			);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch Nx Cloud performance: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 300000, // 5 minutes
		staleTime: 120000, // 2 minutes
	});
}
