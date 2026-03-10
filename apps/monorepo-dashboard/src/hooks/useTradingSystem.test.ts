import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useTradingSystem } from './useTradingSystem'
import { tradingService } from '../services/tradingService'

// Mock tradingService
vi.mock('../services/tradingService', () => ({
  tradingService: {
    getBalance: vi.fn(),
    getOpenPositions: vi.fn(),
    getRecentTrades: vi.fn(),
    getPerformanceMetrics: vi.fn(),
    getSystemHealth: vi.fn(),
    generateAlerts: vi.fn(),
  },
}))

// Helper to create query client wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTradingSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    ;(tradingService.getBalance as any).mockResolvedValue({
      balance: 1000,
      timestamp: new Date('2026-01-25T12:00:00Z'),
    })
    ;(tradingService.getOpenPositions as any).mockResolvedValue([
      {
        id: 1,
        pair: 'BTC/USD',
        side: 'long',
        quantity: 0.5,
        entryPrice: 45000,
        currentPrice: 46000,
        pnl: 500,
        createdAt: new Date(),
        status: 'open',
      },
    ])
    ;(tradingService.getRecentTrades as any).mockResolvedValue([
      {
        id: 1,
        pair: 'BTC/USD',
        side: 'buy',
        quantity: 0.5,
        price: 45000,
        executedAt: new Date(),
        pnl: 100,
      },
    ])
    ;(tradingService.getPerformanceMetrics as any).mockResolvedValue({
      winRate: 70,
      totalTrades: 10,
      dailyPnL: 250,
    })
    ;(tradingService.getSystemHealth as any).mockResolvedValue({
      apiConnected: true,
      webSocketConnected: true,
      errorCount: 0,
    })
    ;(tradingService.generateAlerts as any).mockReturnValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return loading state initially', () => {
    // Mock never-resolving promises
    ;(tradingService.getBalance as any).mockImplementation(
      () => new Promise(() => {})
    )
    ;(tradingService.getOpenPositions as any).mockImplementation(
      () => new Promise(() => {})
    )
    ;(tradingService.getRecentTrades as any).mockImplementation(
      () => new Promise(() => {})
    )
    ;(tradingService.getPerformanceMetrics as any).mockImplementation(
      () => new Promise(() => {})
    )
    ;(tradingService.getSystemHealth as any).mockImplementation(
      () => new Promise(() => {})
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('should fetch all trading data successfully', async () => {
    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.status.balance?.balance).toBe(1000)
    expect(result.current.status.positions).toHaveLength(1)
    expect(result.current.status.recentTrades).toHaveLength(1)
    expect(result.current.status.metrics?.winRate).toBe(70)
    expect(result.current.status.health.apiConnected).toBe(true)
  })

  it('should calculate total P&L from positions', async () => {
    ;(tradingService.getOpenPositions as any).mockResolvedValue([
      { pnl: 100 },
      { pnl: 200 },
      { pnl: -50 },
    ])

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.totalPnL).toBe(250)
  })

  it('should return 0 total P&L when no positions', async () => {
    ;(tradingService.getOpenPositions as any).mockResolvedValue([])

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.totalPnL).toBe(0)
  })

  it('should generate alerts from trading data', async () => {
    const mockAlerts = [
      { level: 'warning', message: 'Low balance', timestamp: new Date() },
    ]
    ;(tradingService.generateAlerts as any).mockReturnValue(mockAlerts)

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.status.alerts).toEqual(mockAlerts)
    expect(tradingService.generateAlerts).toHaveBeenCalled()
  })

  it('should handle error from balance query', async () => {
    ;(tradingService.getBalance as any).mockRejectedValue(
      new Error('Balance fetch failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    // Wait longer because the hook has retry: 3 with exponential backoff (1s + 2s + 4s = 7s)
    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy()
      },
      { timeout: 10000 }
    )

    expect(result.current.error?.message).toContain('Balance fetch failed')
  }, 15000) // Increase vitest test timeout to 15s

  it('should handle error from positions query', async () => {
    ;(tradingService.getOpenPositions as any).mockRejectedValue(
      new Error('Positions fetch failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    // Wait longer because the hook has retry: 3 with exponential backoff (1s + 2s + 4s = 7s)
    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy()
      },
      { timeout: 10000 }
    )
  }, 15000) // Increase vitest test timeout to 15s

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear mocks to check refetch behavior
    vi.clearAllMocks()

    // Call refetch
    result.current.refetch()

    await waitFor(() => {
      expect(tradingService.getBalance).toHaveBeenCalled()
      expect(tradingService.getOpenPositions).toHaveBeenCalled()
      expect(tradingService.getRecentTrades).toHaveBeenCalled()
      expect(tradingService.getPerformanceMetrics).toHaveBeenCalled()
      expect(tradingService.getSystemHealth).toHaveBeenCalled()
    })
  })

  it('should return default health when query fails', async () => {
    ;(tradingService.getSystemHealth as any).mockRejectedValue(
      new Error('Health check failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.status.health).toEqual({
      apiConnected: false,
      webSocketConnected: false,
      errorCount: 0,
    })
  })

  it('should return null balance when query fails', async () => {
    ;(tradingService.getBalance as any).mockRejectedValue(
      new Error('Balance failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status.balance).toBeNull()
    })
  })

  it('should return empty positions when query fails', async () => {
    ;(tradingService.getOpenPositions as any).mockRejectedValue(
      new Error('Positions failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status.positions).toEqual([])
    })
  })

  it('should return empty trades when query fails', async () => {
    ;(tradingService.getRecentTrades as any).mockRejectedValue(
      new Error('Trades failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status.recentTrades).toEqual([])
    })
  })

  it('should return null metrics when query fails', async () => {
    ;(tradingService.getPerformanceMetrics as any).mockRejectedValue(
      new Error('Metrics failed')
    )

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.status.metrics).toBeNull()
    })
  })

  it('should call getRecentTrades with limit of 10', async () => {
    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(tradingService.getRecentTrades).toHaveBeenCalledWith(10)
  })

  it('should pass correct data to generateAlerts', async () => {
    const mockBalance = { balance: 500, timestamp: new Date() }
    const mockPositions = [{ pnl: -100 }]
    const mockMetrics = { winRate: 50, totalTrades: 5, dailyPnL: -20 }

    ;(tradingService.getBalance as any).mockResolvedValue(mockBalance)
    ;(tradingService.getOpenPositions as any).mockResolvedValue(mockPositions)
    ;(tradingService.getPerformanceMetrics as any).mockResolvedValue(mockMetrics)

    const { result } = renderHook(() => useTradingSystem(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(tradingService.generateAlerts).toHaveBeenCalledWith(
      mockBalance,
      mockPositions,
      mockMetrics
    )
  })
})
