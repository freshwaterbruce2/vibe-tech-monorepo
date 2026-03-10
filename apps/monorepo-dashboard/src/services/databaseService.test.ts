import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { databaseService } from './databaseService'

// Mock fetch globally
global.fetch = vi.fn()

// Mock the KNOWN_DATABASES export
vi.mock('../types', async (importOriginal) => {
  const original = await importOriginal<typeof import('../types')>()
  return {
    ...original,
    KNOWN_DATABASES: [
      { name: 'Trading DB', path: 'D:\\databases\\trading.db' },
      { name: 'App DB', path: 'D:\\databases\\app.db' },
    ],
  }
})

describe('databaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllDatabases', () => {
    it('should fetch all databases successfully', async () => {
      const mockResponse = [
        {
          name: 'trading.db',
          path: 'D:\\databases\\trading.db',
          size: 1024000,
          status: 'connected',
          tableCount: 10,
          lastModified: '2026-01-25T12:00:00Z',
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await databaseService.getAllDatabases()

      expect(result).toHaveLength(2) // Both known databases
      expect(result[0]).toEqual({
        name: 'Trading DB',
        path: 'D:\\databases\\trading.db',
        size: 1024000,
        tableCount: 10,
        status: 'connected',
        lastModified: new Date('2026-01-25T12:00:00Z'),
      })
    })

    it('should return disconnected status for missing databases', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const result = await databaseService.getAllDatabases()

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('disconnected')
      expect(result[0].size).toBe(0)
      expect(result[0].tableCount).toBe(0)
    })

    it('should throw error on HTTP failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(databaseService.getAllDatabases()).rejects.toThrow(
        'HTTP 500'
      )
    })

    it('should handle case-insensitive path matching', async () => {
      const mockResponse = [
        {
          name: 'trading.db',
          path: 'd:\\DATABASES\\trading.db', // Different case
          size: 1024,
          status: 'connected',
          tableCount: 5,
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await databaseService.getAllDatabases()

      expect(result[0].status).toBe('connected')
    })
  })

  describe('getDatabaseStatus', () => {
    it('should get status of a single database', async () => {
      const mockResponse = [
        {
          name: 'trading.db',
          path: 'D:\\databases\\trading.db',
          size: 2048,
          status: 'connected',
          tableCount: 15,
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await databaseService.getDatabaseStatus({
        name: 'Trading DB',
        path: 'D:\\databases\\trading.db',
      })

      expect(result.status).toBe('connected')
      expect(result.size).toBe(2048)
    })

    it('should return disconnected for non-existent database', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const result = await databaseService.getDatabaseStatus({
        name: 'Unknown DB',
        path: 'D:\\databases\\unknown.db',
      })

      expect(result.status).toBe('disconnected')
      expect(result.size).toBe(0)
    })
  })

  describe('getDatabaseHealth', () => {
    it('should fetch database health successfully', async () => {
      const mockHealth = {
        databaseName: 'trading.db',
        walMode: true,
        walFileSize: 1024,
        integrityCheck: true,
        locked: false,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      })

      const result = await databaseService.getDatabaseHealth(
        'D:\\databases\\trading.db'
      )

      expect(result).toEqual(mockHealth)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('D%3A%5Cdatabases%5Ctrading.db')
      )
    })

    it('should return unhealthy defaults on HTTP error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
      })

      const result = await databaseService.getDatabaseHealth(
        'D:\\databases\\trading.db'
      )

      expect(result).toEqual({
        databaseName: 'D:\\databases\\trading.db',
        walMode: false,
        integrityCheck: false,
        locked: false,
      })
    })

    it('should return unhealthy defaults on network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await databaseService.getDatabaseHealth(
        'D:\\databases\\trading.db'
      )

      expect(result.integrityCheck).toBe(false)
    })
  })

  describe('getDatabaseMetrics', () => {
    it('should calculate metrics from databases', async () => {
      const databases = [
        {
          name: 'DB1',
          path: 'path1',
          size: 1000,
          tableCount: 10,
          status: 'connected' as const,
        },
        {
          name: 'DB2',
          path: 'path2',
          size: 2000,
          tableCount: 20,
          status: 'connected' as const,
        },
        {
          name: 'DB3',
          path: 'path3',
          size: 500,
          tableCount: 5,
          status: 'disconnected' as const,
        },
      ]

      const result = await databaseService.getDatabaseMetrics(databases)

      expect(result).toEqual({
        totalDatabases: 3,
        connectedDatabases: 2,
        disconnectedDatabases: 1,
        totalSize: 3500,
        totalTables: 35,
      })
    })

    it('should handle empty database list', async () => {
      const result = await databaseService.getDatabaseMetrics([])

      expect(result).toEqual({
        totalDatabases: 0,
        connectedDatabases: 0,
        disconnectedDatabases: 0,
        totalSize: 0,
        totalTables: 0,
      })
    })

    it('should handle all disconnected databases', async () => {
      const databases = [
        {
          name: 'DB1',
          path: 'path1',
          size: 0,
          tableCount: 0,
          status: 'disconnected' as const,
        },
      ]

      const result = await databaseService.getDatabaseMetrics(databases)

      expect(result.connectedDatabases).toBe(0)
      expect(result.disconnectedDatabases).toBe(1)
    })
  })

  describe('vacuumDatabase', () => {
    it('should return false (not implemented)', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await databaseService.vacuumDatabase(
        'D:\\databases\\trading.db'
      )

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('analyzeDatabase', () => {
    it('should return false (not implemented)', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await databaseService.analyzeDatabase(
        'D:\\databases\\trading.db'
      )

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})
