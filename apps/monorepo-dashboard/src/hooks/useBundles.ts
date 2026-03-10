import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

interface BundleSnapshot {
	id?: number;
	project_name: string;
	timestamp: string;
	total_size: number;
	gzip_size: number;
	chunk_count: number;
	largest_chunk: string;
	largest_chunk_size: number;
}

interface BundleLatest extends BundleSnapshot {
	regression: boolean;
	size_change_percent?: number;
}

interface BundleTrend {
	project_name: string;
	snapshots: Array<{
		timestamp: string;
		total_size: number;
		gzip_size: number;
	}>;
	average_size: number;
	trend: "increasing" | "decreasing" | "stable";
}

interface ChunkAnalysis {
	name: string;
	size: number;
	gzip_size: number;
	percent_of_total: number;
}

interface BundleAnalysis {
	project_name: string;
	total_size: number;
	gzip_size: number;
	chunk_count: number;
	chunks: ChunkAnalysis[];
	largest_chunks: ChunkAnalysis[];
	compression_ratio: number;
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = "http://localhost:5177/api";

// ============================================================================
// Hooks
// ============================================================================

/**
 * GET /api/bundles/latest
 * Fetch current bundle sizes for all projects
 */
export function useBundleSizes() {
	return useQuery<BundleLatest[], Error>({
		queryKey: ["bundles", "latest"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/bundles/latest`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch bundle sizes: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 180000, // 3 minutes
		staleTime: 90000, // 1.5 minutes
	});
}

/**
 * GET /api/bundles/trends?days=30
 * Fetch historical bundle size trends
 */
export function useBundleTrends(days = 30) {
	return useQuery<BundleTrend[], Error>({
		queryKey: ["bundles", "trends", days],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/bundles/trends?days=${days}`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch bundle trends: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 300000, // 5 minutes
		staleTime: 120000, // 2 minutes
	});
}

/**
 * GET /api/bundles/analysis/:project
 * Fetch detailed bundle analysis for a specific project
 */
export function useBundleAnalysis(projectName: string) {
	return useQuery<BundleAnalysis | null, Error>({
		queryKey: ["bundles", "analysis", projectName],
		queryFn: async () => {
			const res = await fetch(
				`${API_BASE_URL}/bundles/analysis/${encodeURIComponent(projectName)}`,
			);

			if (res.status === 404) {
				return null; // Project not found
			}

			if (!res.ok) {
				throw new Error(
					`Failed to fetch bundle analysis: ${res.status} ${res.statusText}`,
				);
			}

			return res.json();
		},
		enabled: !!projectName, // Only run if projectName is provided
		refetchInterval: 180000, // 3 minutes
		staleTime: 90000, // 1.5 minutes
	});
}
