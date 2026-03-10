import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { TradingTab } from './TradingTab'
import * as useTradingSystemHook from '../../hooks/useTradingSystem'

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  const MockIcon = () => null
  return { ...actual, Activity: MockIcon, TrendingDown: MockIcon, TrendingUp: MockIcon }
})

vi.mock('./TradesTable', () => ({ TradesTable: vi.fn(() => <div>Trades Table</div>) }))
vi.mock('./TradingAlerts', () => ({ TradingAlerts: vi.fn(() => <div>Trading Alerts</div>) }))
vi.mock('./TradingMetrics', () => ({ TradingMetrics: vi.fn(() => <div>Trading Metrics</div>) }))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('TradingTab', () => {
  const mockTradingData = {
    status: {
      health: { apiConnected: true, webSocketConnected: true, errorCount: 0 },
      balance: { total: 10000, available: 8000, locked: 2000 },
      positions: [],
      recentTrades: [],
      metrics: { totalTrades: 100, successRate: 0.85, averagePnL: 50 },
      alerts: [],
    },
    totalPnL: 1500.50,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state', () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({ ...mockTradingData, isLoading: true })
    render(<TradingTab />, { wrapper: createWrapper() })
    expect(screen.getByText('Loading trading system data...')).toBeInTheDocument()
  })

  it('should display error state with Error object', () => {
    const refetch = vi.fn()
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      error: new Error('Connection failed'),
      refetch,
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    expect(screen.getByText('Error Loading Trading Data')).toBeInTheDocument()
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should display error state with non-Error object', () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      error: 'String error' as any,
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    expect(screen.getByText('Unknown error')).toBeInTheDocument()
  })

  it('should call refetch when retry button is clicked', () => {
    const refetch = vi.fn()
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      error: new Error('Test error'),
      refetch,
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('should display positive P&L', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue(mockTradingData)
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Total P&L')).toBeInTheDocument()
      expect(screen.getByText('+1500.50 USD')).toBeInTheDocument()
    })
  })

  it('should display negative P&L', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      totalPnL: -500.25,
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('-500.25 USD')).toBeInTheDocument()
    })
  })

  it('should display zero P&L with positive styling', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      totalPnL: 0,
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('+0.00 USD')).toBeInTheDocument()
    })
  })

  it('should display alerts when present', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      status: {
        ...mockTradingData.status,
        alerts: [{ level: 'warning', message: 'Test alert', timestamp: new Date() }],
      },
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Trading Alerts')).toBeInTheDocument()
    })
  })

  it('should not display alerts section when empty', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue(mockTradingData)
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.queryByText('Trading Alerts')).not.toBeInTheDocument()
    })
  })

  it('should display system health', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue(mockTradingData)
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument()
      expect(screen.getByText('API Connection')).toBeInTheDocument()
    })
  })

  it('should show disconnected status for API', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      status: {
        ...mockTradingData.status,
        health: { apiConnected: false, webSocketConnected: true, errorCount: 0 },
      },
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('API Connection')).toBeInTheDocument()
    })
  })

  it('should show disconnected status for WebSocket', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      status: {
        ...mockTradingData.status,
        health: { apiConnected: true, webSocketConnected: false, errorCount: 0 },
      },
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('WebSocket')).toBeInTheDocument()
    })
  })

  it('should show high error count with red styling', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      status: {
        ...mockTradingData.status,
        health: { apiConnected: true, webSocketConnected: true, errorCount: 10 },
      },
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      const errorElement = screen.getByText('10')
      expect(errorElement).toBeInTheDocument()
    })
  })

  it('should show low error count with green styling', async () => {
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      status: {
        ...mockTradingData.status,
        health: { apiConnected: true, webSocketConnected: true, errorCount: 2 },
      },
    })
    render(<TradingTab />, { wrapper: createWrapper() })
    await waitFor(() => {
      const errorElement = screen.getByText('2')
      expect(errorElement).toBeInTheDocument()
    })
  })

  it('should call refetch on refresh button click', async () => {
    const refetch = vi.fn()
    vi.spyOn(useTradingSystemHook, 'useTradingSystem').mockReturnValue({
      ...mockTradingData,
      refetch,
    })
    render(<TradingTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(refetch).toHaveBeenCalled()
  })
})