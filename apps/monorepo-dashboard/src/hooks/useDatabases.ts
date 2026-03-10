// React Query hook for database monitoring
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { databaseService } from "../services/databaseService";

export function useDatabases() {
	const queryClient = useQueryClient();

	const databasesQuery = useQuery({
		queryKey: ["databases"],
		queryFn: async () => databaseService.getAllDatabases(),
		refetchInterval: 30000, // 30 seconds
		staleTime: 30000,
		retry: 2,
	});

	// Calculate metrics
	const metricsQuery = useQuery({
		queryKey: ["databases", "metrics"],
		queryFn: async () => {
			const databases = await databaseService.getAllDatabases();
			return databaseService.getDatabaseMetrics(databases);
		},
		refetchInterval: 30000,
		staleTime: 30000,
		enabled: !!databasesQuery.data,
	});

	// Mutation for VACUUM operation
	const vacuumMutation = useMutation({
		mutationFn: async (dbPath: string) => databaseService.vacuumDatabase(dbPath),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["databases"] });
		},
	});

	// Mutation for ANALYZE operation
	const analyzeMutation = useMutation({
		mutationFn: async (dbPath: string) => databaseService.analyzeDatabase(dbPath),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["databases"] });
		},
	});

	return {
		databases: databasesQuery.data ?? [],
		metrics: metricsQuery.data ?? {
			totalDatabases: 0,
			connectedDatabases: 0,
			disconnectedDatabases: 0,
			totalSize: 0,
			totalTables: 0,
		},
		isLoading: databasesQuery.isLoading,
		error: databasesQuery.error,
		refetch: databasesQuery.refetch,
		vacuum: vacuumMutation.mutate,
		analyze: analyzeMutation.mutate,
		isVacuuming: vacuumMutation.isPending,
		isAnalyzing: analyzeMutation.isPending,
	};
}

/**
 * Hook for getting health of a specific database
 */
export function useDatabaseHealth(dbPath: string | null) {
	return useQuery({
		queryKey: ["database", "health", dbPath],
		queryFn: async () => databaseService.getDatabaseHealth(dbPath!),
		enabled: !!dbPath,
		refetchInterval: 60000, // 1 minute
		staleTime: 60000,
	});
}
