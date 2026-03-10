import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { tradingService } from './tradingService'
import { mcpClient } from './mcpClient'
import type { PerformanceMetrics, Position, TradingBalance } from '../types'

// Mock mcpClient
vi.mock('./mcpClient', () => ({
  mcpClient: {
    callSQLite: vi.fn(),
  },
}))

describe('tradingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getBalance', () => {
    it('should fetch balance successfully', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        { balance: '1000.50', timestamp: '2026-01-25T12:00:00Z' },
      ])

      const result = await tradingService.getBalance()

      expect(result).toEqual({
        balance: 1000.50,
        timestamp: new Date('2026-01-25T12:00:00Z'),
      })
    })

    it('should throw error when no balance data found', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([])

      await expect(tradingService.getBalance()).rejects.toThrow(
        'No balance data found'
      )
    })

    it('should throw error on MCP failure', async () => {
      ;(mcpClient.callSQLite as any).mockRejectedValueOnce(
        new Error('Database error')
      )

      await expect(tradingService.getBalance()).rejects.toThrow('Database error')
    })
  })

  describe('getOpenPositions', () => {
    it('should fetch open positions successfully', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'long',
          quantity: '0.5',
          entry_price: '45000',
          current_price: '46000',
          pnl: '500',
          created_at: '2026-01-25T10:00:00Z',
          status: 'open',
        },
      ])

      const result = await tradingService.getOpenPositions()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 1,
        pair: 'BTC/USD',
        side: 'long',
        quantity: 0.5,
        entryPrice: 45000,
        currentPrice: 46000,
        pnl: 500,
        createdAt: new Date('2026-01-25T10:00:00Z'),
        status: 'open',
      })
    })

    it('should handle null pnl values', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        {
          id: 1,
          pair: 'ETH/USD',
          side: 'short',
          quantity: '1',
          entry_price: '2500',
          current_price: '2400',
          pnl: null,
          created_at: '2026-01-25T10:00:00Z',
          status: 'open',
        },
      ])

      const result = await tradingService.getOpenPositions()

      expect(result[0].pnl).toBe(0)
    })

    it('should return empty array on error', async () => {
      ;(mcpClient.callSQLite as any).mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await tradingService.getOpenPositions()

      expect(result).toEqual([])
    })
  })

  describe('getRecentTrades', () => {
    it('should fetch recent trades with default limit', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'buy',
          quantity: '0.1',
          price: '45000',
          executed_at: '2026-01-25T11:00:00Z',
          pnl: '100',
          fees: '5',
        },
      ])

      const result = await tradingService.getRecentTrades()

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 1,
        pair: 'BTC/USD',
        side: 'buy',
        quantity: 0.1,
        price: 45000,
        executedAt: new Date('2026-01-25T11:00:00Z'),
        pnl: 100,
        fees: 5,
      })
    })

    it('should fetch trades with custom limit', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([])

      await tradingService.getRecentTrades(10)

      expect(mcpClient.callSQLite).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10'),
        expect.any(String)
      )
    })

    it('should handle null pnl and fees', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        {
          id: 1,
          pair: 'ETH/USD',
          side: 'sell',
          quantity: '2',
          price: '2500',
          executed_at: '2026-01-25T11:00:00Z',
          pnl: null,
          fees: null,
        },
      ])

      const result = await tradingService.getRecentTrades()

      expect(result[0].pnl).toBe(0)
      expect(result[0].fees).toBeUndefined()
    })

    it('should return empty array on error', async () => {
      ;(mcpClient.callSQLite as any).mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await tradingService.getRecentTrades()

      expect(result).toEqual([])
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should fetch performance metrics successfully', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        {
          total_trades: '10',
          wins: '7',
          daily_pnl: '250.50',
        },
      ])

      const result = await tradingService.getPerformanceMetrics()

      expect(result).toEqual({
        winRate: 70,
        totalTrades: 10,
        dailyPnL: 250.50,
      })
    })

    it('should handle zero trades', async () => {
      ;(mcpClient.callSQLite as any).mockResolvedValueOnce([
        {
          total_trades: '0',
          wins: '0',
          daily_pnl: null,
        },
      ])

      const result = await tradingService.getPerformanceMetrics()

      expect(result).toEqual({
        winRate: 0,
        totalTrades: 0,
        dailyPnL: 0,
      })
    })

    it('should return zeros on error', async () => {
      ;(mcpClient.callSQLite as any).mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await tradingService.getPerformanceMetrics()

      expect(result).toEqual({
        winRate: 0,
        totalTrades: 0,
        dailyPnL: 0,
      })
    })
  })

  describe('getSystemHealth', () => {
    it('should return healthy system status', async () => {
      const result = await tradingService.getSystemHealth()

      expect(result).toEqual({
        apiConnected: true,
        webSocketConnected: true,
        errorCount: 0,
      })
    })
  })

  describe('generateAlerts', () => {
    it('should generate critical alert for low balance', () => {
      const balance: TradingBalance = {
        balance: 50,
        timestamp: new Date(),
      }

      const alerts = tradingService.generateAlerts(balance, [], null)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe('critical')
      expect(alerts[0].message).toContain('below $100')
    })

    it('should not generate alert for healthy balance', () => {
      const balance: TradingBalance = {
        balance: 1000,
        timestamp: new Date(),
      }

      const alerts = tradingService.generateAlerts(balance, [], null)

      expect(alerts).toHaveLength(0)
    })

    it('should generate warning for negative total P&L', () => {
      const positions: Position[] = [
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'long',
          quantity: 1,
          entryPrice: 45000,
          currentPrice: 44000,
          pnl: -15,
          createdAt: new Date(),
          status: 'open',
        },
      ]

      const alerts = tradingService.generateAlerts(null, positions, null)

      expect(alerts.some(a => a.level === 'warning')).toBe(true)
    })

    it('should not generate warning for small negative P&L', () => {
      const positions: Position[] = [
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'long',
          quantity: 1,
          entryPrice: 45000,
          currentPrice: 44990,
          pnl: -5,
          createdAt: new Date(),
          status: 'open',
        },
      ]

      const alerts = tradingService.generateAlerts(null, positions, null)

      expect(alerts.some(a => a.level === 'warning')).toBe(false)
    })

    it('should generate info alert for positive daily P&L', () => {
      const metrics: PerformanceMetrics = {
        winRate: 70,
        totalTrades: 10,
        dailyPnL: 100,
      }

      const alerts = tradingService.generateAlerts(null, [], metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe('info')
      expect(alerts[0].message).toContain('+$100')
    })

    it('should generate info alert for negative daily P&L', () => {
      const metrics: PerformanceMetrics = {
        winRate: 30,
        totalTrades: 10,
        dailyPnL: -50,
      }

      const alerts = tradingService.generateAlerts(null, [], metrics)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe('info')
      // The format is "$-50.00" (dollar sign before the negative number)
      expect(alerts[0].message).toContain('$-50')
    })

    it('should not generate info alert for zero daily P&L', () => {
      const metrics: PerformanceMetrics = {
        winRate: 50,
        totalTrades: 0,
        dailyPnL: 0,
      }

      const alerts = tradingService.generateAlerts(null, [], metrics)

      expect(alerts).toHaveLength(0)
    })

    it('should generate multiple alerts', () => {
      const balance: TradingBalance = {
        balance: 50,
        timestamp: new Date(),
      }
      const positions: Position[] = [
        {
          id: 1,
          pair: 'BTC/USD',
          side: 'long',
          quantity: 1,
          entryPrice: 45000,
          currentPrice: 44000,
          pnl: -20,
          createdAt: new Date(),
          status: 'open',
        },
      ]
      const metrics: PerformanceMetrics = {
        winRate: 30,
        totalTrades: 10,
        dailyPnL: -100,
      }

      const alerts = tradingService.generateAlerts(balance, positions, metrics)

      expect(alerts.length).toBeGreaterThanOrEqual(3)
      expect(alerts.some(a => a.level === 'critical')).toBe(true)
      expect(alerts.some(a => a.level === 'warning')).toBe(true)
      expect(alerts.some(a => a.level === 'info')).toBe(true)
    })

    it('should handle null balance', () => {
      const alerts = tradingService.generateAlerts(null, [], null)

      expect(alerts).toHaveLength(0)
    })
  })
})
