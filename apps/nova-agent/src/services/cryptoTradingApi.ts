/**
 * Crypto Trading API Service
 * Connects React dashboard to the Python FastAPI backend
 */

import type {
  Balance,
  DashboardSummary,
  MarketData,
  Order,
  Position,
  PositionSummary,
  RiskMetrics,
  Trade,
  TradingActivity,
} from '@/types/crypto-trading';

const API_BASE_URL = import.meta.env.VITE_CRYPTO_API_URL ?? 'http://localhost:8001';

class CryptoTradingApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'CryptoTradingApiError';
  }
}

interface ApiErrorPayload {
  detail?: string;
}

interface CountResponse<T> {
  data: T[];
  count: number;
}

interface MarketDataPayload {
  c?: [string, ...string[]];
}

type KrakenTickerMap = Record<string, MarketDataPayload | undefined>;

const KRAKEN_ASSET_MAP: Record<string, string> = {
  BTC: 'XXBT',
  ETH: 'XETH',
  XLM: 'XXLM',
  USD: 'ZUSD',
  EUR: 'ZEUR',
  GBP: 'ZGBP',
  CAD: 'ZCAD',
  JPY: 'ZJPY',
  CHF: 'ZCHF',
  USDT: 'USDT',
  USDC: 'USDC',
};

function toKrakenSymbol(asset: string): string {
  const upper = asset.toUpperCase();
  return KRAKEN_ASSET_MAP[upper] ?? (upper.length <= 3 ? `X${upper}` : upper);
}

function krakenTickerKey(pair: string): string | undefined {
  const [base, quote] = pair.split('/');
  if (!base || !quote) return undefined;
  return toKrakenSymbol(base) + toKrakenSymbol(quote);
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      const errorData: ApiErrorPayload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}) as ApiErrorPayload)
        : ({} as ApiErrorPayload);
      throw new CryptoTradingApiError(
        response.status,
        errorData.detail ?? `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new CryptoTradingApiError(
        response.status,
        `Expected JSON response but received ${contentType}`,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof CryptoTradingApiError) {
      throw error;
    }

    // Network or other errors
    throw new CryptoTradingApiError(
      0,
      error instanceof Error ? error.message : 'Unknown error occurred',
    );
  }
}

/**
 * API Service Class
 */
export class CryptoTradingApi {
  private readonly __instanceMarker = true;

  /**
   * Health check
   */
  static async checkHealth(): Promise<{
    status: string;
    database: string;
    timestamp: string;
  }> {
    return apiFetch('/api/health');
  }

  /**
   * Get account balances
   */
  static async getBalances(): Promise<Balance[]> {
    return apiFetch<Balance[]>('/api/balances');
  }

  /**
   * Get trading positions
   */
  static async getPositions(status?: 'open' | 'closed'): Promise<Position[]> {
    const params = status ? `?status=${status}` : '';
    return apiFetch<Position[]>(`/api/positions${params}`);
  }

  /**
   * Get dashboard summary
   */
  static async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiFetch<{
      total_portfolio_value: number;
      total_pnl: number;
      total_pnl_percent: number;
      daily_pnl: number;
      daily_pnl_percent: number;
      open_positions: number;
      active_orders: number;
      available_balance: number;
      total_exposure: number;
      risk_score: number;
      win_rate: number;
      last_updated: string;
    }>('/api/dashboard/summary');

    // Transform snake_case to camelCase
    return {
      totalPortfolioValue: response.total_portfolio_value,
      totalPnL: response.total_pnl,
      totalPnLPercent: response.total_pnl_percent,
      dailyPnL: response.daily_pnl,
      dailyPnLPercent: response.daily_pnl_percent,
      openPositions: response.open_positions,
      activeOrders: response.active_orders,
      availableBalance: response.available_balance,
      totalExposure: response.total_exposure,
      riskScore: response.risk_score,
      winRate: response.win_rate,
      lastUpdated: response.last_updated,
    };
  }

  /**
   * Get risk metrics
   */
  static async getRiskMetrics(): Promise<RiskMetrics> {
    const response = await apiFetch<{
      total_exposure: number;
      max_exposure: number;
      exposure_percent: number;
      position_count: number;
      max_positions: number;
      risk_score: number;
      max_risk_score: number;
      portfolio_value: number;
      available_balance: number;
      margin_used: number;
      margin_available: number;
    }>('/api/risk-metrics');

    return {
      totalExposure: response.total_exposure,
      maxExposure: response.max_exposure,
      exposurePercent: response.exposure_percent,
      positionCount: response.position_count,
      maxPositions: response.max_positions,
      riskScore: response.risk_score,
      maxRiskScore: response.max_risk_score,
      portfolioValue: response.portfolio_value,
      availableBalance: response.available_balance,
      marginUsed: response.margin_used,
      marginAvailable: response.margin_available,
    };
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(limit = 50): Promise<TradingActivity[]> {
    const response = await apiFetch<{ data: TradingActivity[]; count: number }>(
      `/api/activity?limit=${limit}`,
    );
    return response.data;
  }

  /**
   * Get recent orders
   */
  static async getOrders(limit = 100): Promise<Order[]> {
    const response = await apiFetch<CountResponse<Order>>(`/api/orders?limit=${limit}`);
    return response.data;
  }

  /**
   * Get recent trades
   */
  static async getTrades(pair?: string, limit = 100): Promise<Trade[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (pair) params.append('pair', pair);

    const response = await apiFetch<CountResponse<Trade>>(`/api/trades?${params.toString()}`);
    return response.data;
  }

  /**
   * Get market data for a trading pair
   */
  static async getMarketData(pair: string): Promise<KrakenTickerMap> {
    const response = await apiFetch<{ data: KrakenTickerMap; timestamp: string }>(
      `/api/market-data/${pair}`,
    );
    return response.data;
  }

  /**
   * Build a position summary from live market data
   */
  private static buildPositionSummary(
    position: Position,
    marketData: KrakenTickerMap,
  ): PositionSummary {
    const tickerKey = krakenTickerKey(position.pair);
    const rawCurrentPrice = tickerKey ? marketData[tickerKey]?.c?.[0] : undefined;
    const currentPrice = Number(rawCurrentPrice ?? position.entry_price);

    // Calculate unrealized P&L
    const priceDiff = currentPrice - position.entry_price;
    const unrealizedPnL =
      position.side === 'long' ? priceDiff * position.volume : -priceDiff * position.volume;
    const costBasis = position.entry_price * position.volume;
    const unrealizedPnLPercent = costBasis === 0 ? 0 : (unrealizedPnL / costBasis) * 100;

    // Calculate duration
    const openedAt = new Date(position.opened_at);
    const now = new Date();
    const durationHours = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);

    // Calculate risk amount (distance to stop loss)
    const riskAmount = position.stop_loss
      ? Math.abs(position.entry_price - position.stop_loss) * position.volume
      : 0;

    return {
      position,
      currentPrice,
      unrealizedPnL,
      unrealizedPnLPercent,
      riskAmount,
      durationHours,
      marketData: {
        id: 0,
        pair: position.pair,
        timestamp: new Date().toISOString(),
        close: currentPrice,
        created_at: new Date().toISOString(),
      } satisfies MarketData,
    };
  }

  /**
   * Fallback summary using estimated values when market data is unavailable
   */
  private static buildFallbackPositionSummary(position: Position): PositionSummary {
    return {
      position,
      currentPrice: position.entry_price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      riskAmount: 0,
      durationHours: 0,
      marketData: {
        id: 0,
        pair: position.pair,
        timestamp: new Date().toISOString(),
        close: position.entry_price,
        created_at: new Date().toISOString(),
      } satisfies MarketData,
    };
  }

  /**
   * Resolve a single position summary, falling back on error
   */
  private static async resolvePositionSummary(position: Position): Promise<PositionSummary> {
    try {
      const marketData = await CryptoTradingApi.getMarketData(position.pair);
      return CryptoTradingApi.buildPositionSummary(position, marketData);
    } catch (error) {
      console.error(`Failed to get market data for ${position.pair}:`, error);
      return CryptoTradingApi.buildFallbackPositionSummary(position);
    }
  }

  /**
   * Get position summaries with current market data
   */
  static async getPositionSummaries(): Promise<PositionSummary[]> {
    const positions = await CryptoTradingApi.getPositions('open');

    return Promise.all(
      positions.map(async (position) => CryptoTradingApi.resolvePositionSummary(position)),
    );
  }
}

export default CryptoTradingApi;
