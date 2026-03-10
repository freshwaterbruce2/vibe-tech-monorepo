import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

interface Vulnerability {
	name: string;
	severity: "critical" | "high" | "moderate" | "low";
	currentVersion: string;
	fixedVersion: string;
	description: string;
	cve?: string;
}

interface VulnerabilitiesResponse {
	totalVulnerabilities: number;
	critical: number;
	high: number;
	moderate: number;
	low: number;
	vulnerabilities: Vulnerability[];
	lastChecked: string;
}

interface ConfigFileDrift {
	projectName: string;
	differences: string[];
	severity: "minor" | "major";
}

interface ConfigDrift {
	configFile: string;
	totalProjects: number;
	alignedProjects: number;
	driftingProjects: number;
	drifts: ConfigFileDrift[];
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = "http://localhost:5177/api";

// ============================================================================
// Hooks
// ============================================================================

/**
 * GET /api/dependencies/vulnerabilities
 * Fetch security vulnerabilities from npm audit
 */
export function useVulnerabilities() {
	return useQuery<VulnerabilitiesResponse, Error>({
		queryKey: ["dependencies", "vulnerabilities"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/dependencies/vulnerabilities`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch vulnerabilities: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 300000, // 5 minutes (vulnerabilities don't change frequently)
		staleTime: 180000, // 3 minutes
	});
}

/**
 * GET /api/configs/drift
 * Check configuration alignment across all projects
 * Updated to use React Query for better caching and state management
 */
export function useConfigDrift() {
	const query = useQuery<ConfigDrift[], Error>({
		queryKey: ["configs", "drift"],
		queryFn: async () => {
			const res = await fetch(`${API_BASE_URL}/configs/drift`);
			if (!res.ok) {
				throw new Error(
					`Failed to fetch config drift: ${res.status} ${res.statusText}`,
				);
			}
			return res.json();
		},
		refetchInterval: 180000, // 3 minutes
		staleTime: 90000, // 1.5 minutes
	});

	// Calculate metrics from drifts data
	const metrics = {
		totalConfigs: query.data?.length ?? 0,
		totalDrifts:
			query.data?.reduce((sum, d) => sum + d.driftingProjects, 0) ?? 0,
		totalAligned:
			query.data?.reduce((sum, d) => sum + d.alignedProjects, 0) ?? 0,
		configsWithDrift:
			query.data?.filter((d) => d.driftingProjects > 0).length ?? 0,
	};

	return {
		drifts: query.data ?? [],
		loading: query.isLoading,
		error: query.error?.message ?? null,
		metrics,
		// Expose React Query functions for manual control
		refetch: query.refetch,
		isRefetching: query.isRefetching,
	};
}

/**
 * GET /api/configs/drift/:filename
 * Check drift for a specific configuration file (e.g., "tsconfig.json")
 */
export function useConfigFileDrift(filename: string) {
	return useQuery<ConfigDrift | null, Error>({
		queryKey: ["configs", "drift", filename],
		queryFn: async () => {
			const res = await fetch(
				`${API_BASE_URL}/configs/drift/${encodeURIComponent(filename)}`,
			);

			if (res.status === 404) {
				return null; // No files of this type found
			}

			if (!res.ok) {
				throw new Error(
					`Failed to fetch config file drift: ${res.status} ${res.statusText}`,
				);
			}

			return res.json();
		},
		enabled: !!filename, // Only run if filename is provided
		refetchInterval: 180000, // 3 minutes
		staleTime: 90000, // 1.5 minutes
	});
}
