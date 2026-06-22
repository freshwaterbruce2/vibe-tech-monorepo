import { useCallback, useEffect, useMemo, useState } from 'react';
import CryptoTradingApi from '@/services/cryptoTradingApi';
import type {
  Balance,
  ConnectionStatus,
  DashboardSummary,
  PositionSummary,
  RiskMetrics,
  TradingActivity,
} from '@/types/crypto-trading';

interface UseCryptoTradingDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCryptoTradingDashboardReturn {
  // Data
  dashboardSummary: DashboardSummary | null;
  positions: PositionSummary[];
  riskMetrics: RiskMetrics | null;
  balances: Balance[];
  recentActivity: TradingActivity[];
  connectionStatus: ConnectionStatus;

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  refresh: () => Promise<void>;
  clearError: () => void;
}

interface TradingDataBundle {
  summaryData: DashboardSummary;
  riskData: RiskMetrics;
  balanceData: Balance[];
  positionData: PositionSummary[];
  activityData: TradingActivity[];
}

/** Check API health then fetch all dashboard data in parallel */
async function fetchAllTradingData(): Promise<TradingDataBundle> {
  // Check API health first
  const health = await CryptoTradingApi.checkHealth();

  if (health.status !== 'healthy' && health.status !== 'degraded') {
    throw new Error(`API is ${health.status}`);
  }

  // Fetch all data in parallel
  const [summaryData, riskData, balanceData, positionData, activityData] = await Promise.all([
    CryptoTradingApi.getDashboardSummary(),
    CryptoTradingApi.getRiskMetrics(),
    CryptoTradingApi.getBalances(),
    CryptoTradingApi.getPositionSummaries(),
    CryptoTradingApi.getRecentActivity(50),
  ]);

  return { summaryData, riskData, balanceData, positionData, activityData };
}

interface DashboardSetters {
  setDashboardSummary: React.Dispatch<React.SetStateAction<DashboardSummary | null>>;
  setRiskMetrics: React.Dispatch<React.SetStateAction<RiskMetrics | null>>;
  setBalances: React.Dispatch<React.SetStateAction<Balance[]>>;
  setPositions: React.Dispatch<React.SetStateAction<PositionSummary[]>>;
  setRecentActivity: React.Dispatch<React.SetStateAction<TradingActivity[]>>;
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  setLastUpdated: React.Dispatch<React.SetStateAction<Date | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/** Apply a successful data fetch to component state */
function applyTradingData(
  data: TradingDataBundle,
  startTime: number,
  setters: DashboardSetters,
): void {
  setters.setDashboardSummary(data.summaryData);
  setters.setRiskMetrics(data.riskData);
  setters.setBalances(data.balanceData);
  setters.setPositions(data.positionData);
  setters.setRecentActivity(data.activityData);

  const latency = Date.now() - startTime;
  setters.setConnectionStatus({
    connected: true,
    lastHeartbeat: new Date().toISOString(),
    reconnectAttempts: 0,
    latency,
  });

  setters.setLastUpdated(new Date());
  setters.setIsLoading(false);
}

/** Apply a failed data fetch to component state */
function handleFetchError(err: unknown, isFirstLoad: boolean, setters: DashboardSetters): void {
  console.error('Failed to fetch dashboard data:', err);

  const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
  setters.setError(errorMessage);

  setters.setConnectionStatus((prev) => ({
    ...prev,
    connected: false,
    reconnectAttempts: prev.reconnectAttempts + 1,
  }));

  // Keep isLoading true only on first load
  if (isFirstLoad) {
    setters.setIsLoading(false);
  }
}

/** Run an initial fetch then poll on an interval while enabled */
function useAutoRefresh(
  fetchDashboardData: () => Promise<void>,
  autoRefresh: boolean,
  refreshInterval: number,
): void {
  useEffect(() => {
    void fetchDashboardData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        void fetchDashboardData();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval, fetchDashboardData]);
}

/** All dashboard state plus a stable setters bag (extracted to keep the hook small). */
function useDashboardState() {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [recentActivity, setRecentActivity] = useState<TradingActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0,
  });
  const setters = useMemo<DashboardSetters>(
    () => ({
      setDashboardSummary,
      setRiskMetrics,
      setBalances,
      setPositions,
      setRecentActivity,
      setConnectionStatus,
      setLastUpdated,
      setIsLoading,
      setError,
    }),
    [],
  );
  return {
    dashboardSummary,
    positions,
    riskMetrics,
    balances,
    recentActivity,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    connectionStatus,
    setters,
    setIsRefreshing,
  };
}

export function useCryptoTradingDashboard(
  options: UseCryptoTradingDashboardOptions = {},
): UseCryptoTradingDashboardReturn {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  const s = useDashboardState();
  const { setters, setIsRefreshing } = s;

  const fetchDashboardData = useCallback(async () => {
    const startTime = Date.now();
    try {
      setIsRefreshing(true);
      setters.setError(null);
      const data = await fetchAllTradingData();
      applyTradingData(data, startTime, setters);
    } catch (err) {
      handleFetchError(err, s.dashboardSummary === null, setters);
    } finally {
      setIsRefreshing(false);
    }
  }, [s.dashboardSummary, setters, setIsRefreshing]);

  const refresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const clearError = useCallback(() => {
    setters.setError(null);
  }, [setters]);

  useAutoRefresh(fetchDashboardData, autoRefresh, refreshInterval);

  return {
    dashboardSummary: s.dashboardSummary,
    positions: s.positions,
    riskMetrics: s.riskMetrics,
    balances: s.balances,
    recentActivity: s.recentActivity,
    connectionStatus: s.connectionStatus,
    isLoading: s.isLoading,
    isRefreshing: s.isRefreshing,
    error: s.error,
    lastUpdated: s.lastUpdated,
    refresh,
    clearError,
  };
}
