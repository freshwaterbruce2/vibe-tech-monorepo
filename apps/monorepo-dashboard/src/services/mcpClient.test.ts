import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MCPClient, mcpClient } from './mcpClient'

// Mock fetch globally
global.fetch = vi.fn()

describe('MCPClient', () => {
  let client: MCPClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new MCPClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('callNxWorkspace', () => {
    it('should fetch workspace data successfully', async () => {
      const mockWorkspace = {
        projects: {
          'app1': {
            name: 'app1',
            root: 'apps/app1',
            sourceRoot: 'apps/app1/src',
            projectType: 'application',
            tags: ['type:app'],
          },
        },
        version: 1,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkspace,
      })

      const result = await client.callNxWorkspace()

      expect(result).toEqual(mockWorkspace)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/workspace?filter='
      )
    })

    it('should pass filter parameter', async () => {
      const mockWorkspace = { projects: {}, version: 1 }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkspace,
      })

      await client.callNxWorkspace('app*')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/workspace?filter=app*'
      )
    })

    it('should throw error on HTTP failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(client.callNxWorkspace()).rejects.toThrow(
        'Failed to fetch workspace'
      )
    })

    it('should throw error on network failure', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(client.callNxWorkspace()).rejects.toThrow(
        'Failed to fetch workspace'
      )
    })

    it('should validate response with zod schema', async () => {
      const invalidWorkspace = {
        projects: 'not-an-object', // Invalid - should be object
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidWorkspace,
      })

      await expect(client.callNxWorkspace()).rejects.toThrow()
    })
  })

  describe('callSQLite', () => {
    it('should route balance_history query to trading/balance endpoint', async () => {
      const mockBalance = { balance: 1000, timestamp: '2026-01-25' }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalance,
      })

      const result = await client.callSQLite(
        'SELECT * FROM balance_history',
        'D:\\databases\\crypto-enhanced\\trading.db'
      )

      expect(result).toEqual([mockBalance])
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/trading/balance'
      )
    })

    it('should route positions query to trading/positions endpoint', async () => {
      const mockPositions = [{ id: 1, pair: 'BTC/USD' }]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPositions,
      })

      const result = await client.callSQLite(
        'SELECT * FROM positions',
        'D:\\databases\\crypto-enhanced\\trading.db'
      )

      expect(result).toEqual(mockPositions)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/trading/positions'
      )
    })

    it('should route trades query to trading/trades endpoint', async () => {
      const mockTrades = [{ id: 1, pair: 'ETH/USD' }]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrades,
      })

      const result = await client.callSQLite(
        'SELECT * FROM trades',
        'D:\\databases\\crypto-enhanced\\trading.db'
      )

      expect(result).toEqual(mockTrades)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/trading/trades?limit=10'
      )
    })

    it('should route total_trades query to trading/metrics endpoint', async () => {
      const mockMetrics = { total_trades: 50, wins: 30 }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      })

      // Use "total_trades" without "trades" standalone to avoid matching the trades endpoint first
      const result = await client.callSQLite(
        'SELECT total_trades, wins FROM performance',
        'D:\\databases\\crypto-enhanced\\trading.db'
      )

      expect(result).toEqual([mockMetrics])
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/trading/metrics'
      )
    })

    it('should return empty array for non-trading queries', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await client.callSQLite(
        'SELECT * FROM unknown',
        'D:\\other\\db.db'
      )

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should throw error on fetch failure', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(
        client.callSQLite(
          'SELECT * FROM balance_history',
          'D:\\databases\\crypto-enhanced\\trading.db'
        )
      ).rejects.toThrow('SQLite query failed')
    })

    it('should return empty array when balance data is null', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })

      const result = await client.callSQLite(
        'SELECT * FROM balance_history',
        'D:\\databases\\crypto-enhanced\\trading.db'
      )

      expect(result).toEqual([])
    })
  })

  describe('callFilesystem', () => {
    it('should route databases path to databases endpoint', async () => {
      const mockDatabases = [{ name: 'trading.db', size: 1024 }]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatabases,
      })

      const result = await client.callFilesystem('D:\\databases')

      expect(result).toEqual(mockDatabases)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/databases'
      )
    })

    it('should handle case-insensitive databases path', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await client.callFilesystem('D:\\DATABASES\\something')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/databases'
      )
    })

    it('should return empty array for non-databases paths', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await client.callFilesystem('C:\\dev')

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should throw error on HTTP failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      await expect(client.callFilesystem('D:\\databases')).rejects.toThrow(
        'Filesystem operation failed'
      )
    })
  })

  describe('callDesktopCommander', () => {
    it('should route dc_list_processes to services endpoint', async () => {
      const mockProcesses = [{ name: 'node', pid: 1234 }]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProcesses,
      })

      const result = await client.callDesktopCommander('dc_list_processes')

      expect(result).toEqual(mockProcesses)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/services'
      )
    })

    it('should return null for unknown commands', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await client.callDesktopCommander('unknown_command')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should throw error on HTTP failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
      })

      await expect(
        client.callDesktopCommander('dc_list_processes')
      ).rejects.toThrow('Desktop Commander dc_list_processes failed')
    })
  })

  describe('fetchUrl', () => {
    it('should fetch URL and return status', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      const result = await client.fetchUrl('http://localhost:3000')

      expect(result).toEqual({
        ok: true,
        status: 200,
        statusText: 'OK',
      })
    })

    it('should use GET method by default', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      await client.fetchUrl('http://localhost:3000')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should support HEAD method', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      await client.fetchUrl('http://localhost:3000', 'HEAD')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({ method: 'HEAD' })
      )
    })

    it('should throw error on fetch failure', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'))

      await expect(client.fetchUrl('http://localhost:3000')).rejects.toThrow(
        'Connection refused'
      )
    })
  })

  describe('listProcesses', () => {
    it('should call desktop commander with limit', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await client.listProcesses(100)

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should use default limit of 50', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await client.listProcesses()

      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('getSystemInfo', () => {
    it('should call desktop commander for system info', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await client.getSystemInfo()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})

describe('mcpClient singleton', () => {
  it('should be an instance of MCPClient', () => {
    expect(mcpClient).toBeInstanceOf(MCPClient)
  })
})
