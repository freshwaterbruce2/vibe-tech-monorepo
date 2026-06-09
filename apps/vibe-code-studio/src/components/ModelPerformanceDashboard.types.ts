export interface ModelMetrics {
  name: string;
  displayName: string;
  requests: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
  acceptanceRate: number;
  tokensUsed: number;
}

export interface TimeSeriesData {
  time: string;
  free: number;
  low: number;
  mid: number;
  high: number;
}

export interface StrategyDistribution {
  name: string;
  value: number;
  color: string;
}
