// React Query hook for trading system data
import { useQuery } from "@tanstack/react-query";
import { tradingService } from "../services/tradingService";
import type { TradingSystemStatus } from "../types";

export function useTradingSystem() {
	const balanceQuery = useQuery({
		queryKey: ["trading", "balance"],
		queryFn: async () => tradingService.getBalance(),
		refetchInterval: 5000, // 5 seconds - critical data
		staleTime: 5000,
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
	});

	const positionsQuery = useQuery({
		queryKey: ["trading", "positions"],
		queryFn: async () => tradingService.getOpenPositions(),
		refetchInterval: 5000, // 5 seconds
		staleTime: 5000,
		retry: 3,
	});

	const tradesQuery = useQuery({
		queryKey: ["trading", "trades"],
		queryFn: async () => tradingService.getRecentTrades(10),
		refetchInterval: 10000, // 10 seconds
		staleTime: 10000,
		retry: 2,
	});

	const metricsQuery = useQuery({
		queryKey: ["trading", "metrics"],
		queryFn: async () => tradingService.getPerformanceMetrics(),
		refetchInterval: 30000, // 30 seconds
		staleTime: 30000,
		retry: 2,
	});

	const healthQuery = useQuery({
		queryKey: ["trading", "health"],
		queryFn: async () => tradingService.getSystemHealth(),
		refetchInterval: 10000, // 10 seconds
		staleTime: 10000,
	});

	// Aggregate loading state
	const isLoading =
		balanceQuery.isLoading ||
		positionsQuery.isLoading ||
		tradesQuery.isLoading ||
		metricsQuery.isLoading ||
		healthQuery.isLoading;

	// Aggregate error state
	const error =
		balanceQuery.error ||
		positionsQuery.error ||
		tradesQuery.error ||
		metricsQuery.error ||
		healthQuery.error;

	// Calculate total P&L from open positions
	const totalPnL =
		positionsQuery.data?.reduce((sum, pos) => sum + pos.pnl, 0) ?? 0;

	// Generate alerts
	const alerts = tradingService.generateAlerts(
		balanceQuery.data ?? null,
		positionsQuery.data ?? [],
		metricsQuery.data ?? null,
	);

	const status: TradingSystemStatus = {
		balance: balanceQuery.data ?? null,
		positions: positionsQuery.data ?? [],
		recentTrades: tradesQuery.data ?? [],
		metrics: metricsQuery.data ?? null,
		health: healthQuery.data ?? {
			apiConnected: false,
			webSocketConnected: false,
			errorCount: 0,
		},
		alerts,
	};

	return {
		status,
		totalPnL,
		isLoading,
		error,
		refetch: () => {
			balanceQuery.refetch();
			positionsQuery.refetch();
			tradesQuery.refetch();
			metricsQuery.refetch();
			healthQuery.refetch();
		},
	};
}
