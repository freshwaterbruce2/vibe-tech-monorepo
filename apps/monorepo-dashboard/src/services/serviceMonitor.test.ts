import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { serviceMonitor } from './serviceMonitor'
import { mcpClient } from './mcpClient'

// Mock mcpClient
vi.mock('./mcpClient', () => ({
  mcpClient: {
    listProcesses: vi.fn(),
    fetchUrl: vi.fn(),
  },
}))

// Mock KNOWN_SERVICES
vi.mock('../types', async (importOriginal) => {
  const original = await importOriginal<typeof import('../types')>()
  return {
    ...original,
    KNOWN_SERVICES: [
      { name: 'Dashboard Server', port: 5177, url: 'http://localhost:5177' },
      { name: 'Dev Server', port: 5173, url: 'http://localhost:5173' },
    ],
  }
})

describe('serviceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllServices', () => {
    it('should merge backend services with known services', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([
        {
          name: 'node',
          port: 5177,
          status: 'running',
          pid: 1234,
          health: 'healthy',
        },
      ])

      const result = await serviceMonitor.getAllServices()

      expect(result).toHaveLength(2) // Both known services
      expect(result[0]).toMatchObject({
        name: 'Dashboard Server',
        port: 5177,
        status: 'running',
        health: 'healthy',
        pid: 1234,
      })
    })

    it('should mark unknown backend services as running', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([
        {
          name: 'custom-service',
          port: 9000,
          status: 'running',
          pid: 5678,
        },
      ])

      const result = await serviceMonitor.getAllServices()

      const customService = result.find(s => s.port === 9000)
      expect(customService).toBeDefined()
      expect(customService?.status).toBe('running')
    })

    it('should mark missing known services as error', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([])

      const result = await serviceMonitor.getAllServices()

      expect(result.every(s => s.status === 'error')).toBe(true)
      expect(result.every(s => s.health === 'unhealthy')).toBe(true)
    })

    it('should default to degraded health for running services without health info', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([
        {
          name: 'node',
          port: 5177,
          status: 'running',
          pid: 1234,
          // No health property
        },
      ])

      const result = await serviceMonitor.getAllServices()

      const service = result.find(s => s.port === 5177)
      expect(service?.health).toBe('degraded')
    })

    it('should mark stopped services as unhealthy', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([
        {
          name: 'node',
          port: 5177,
          status: 'stopped',
          pid: null,
        },
      ])

      const result = await serviceMonitor.getAllServices()

      const service = result.find(s => s.port === 5177)
      expect(service?.status).toBe('stopped')
      expect(service?.health).toBe('unhealthy')
    })

    it('should handle null pid values', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([
        {
          name: 'node',
          port: 5177,
          status: 'running',
          pid: null,
        },
      ])

      const result = await serviceMonitor.getAllServices()

      const service = result.find(s => s.port === 5177)
      expect(service?.pid).toBeUndefined()
    })
  })

  describe('getServiceStatus', () => {
    it('should get status of a single service', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([
        {
          name: 'node',
          port: 5177,
          status: 'running',
          pid: 1234,
          health: 'healthy',
        },
      ])

      const result = await serviceMonitor.getServiceStatus({
        name: 'Dashboard Server',
        port: 5177,
        url: 'http://localhost:5177',
      })

      expect(result).toMatchObject({
        name: 'Dashboard Server',
        port: 5177,
        status: 'running',
        health: 'healthy',
      })
    })

    it('should return error status for non-existent service', async () => {
      ;(mcpClient.listProcesses as any).mockResolvedValueOnce([])

      const result = await serviceMonitor.getServiceStatus({
        name: 'Unknown Service',
        port: 9999,
        url: 'http://localhost:9999',
      })

      expect(result.status).toBe('error')
      expect(result.health).toBe('unhealthy')
    })

    it('should return error status on MCP failure', async () => {
      ;(mcpClient.listProcesses as any).mockRejectedValueOnce(
        new Error('MCP error')
      )

      const result = await serviceMonitor.getServiceStatus({
        name: 'Test Service',
        port: 3000,
        url: 'http://localhost:3000',
      })

      expect(result.status).toBe('error')
      expect(result.health).toBe('unhealthy')
    })
  })

  describe('performHealthCheck', () => {
    it('should perform successful health check', async () => {
      ;(mcpClient.fetchUrl as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
      })

      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177/health'
      )

      expect(result.healthy).toBe(true)
      expect(result.status).toBe(200)
      expect(result.url).toBe('http://localhost:5177/health')
      expect(result.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should detect unhealthy service on 500 error', async () => {
      ;(mcpClient.fetchUrl as any).mockResolvedValueOnce({
        status: 500,
        ok: false,
      })

      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177/health'
      )

      expect(result.healthy).toBe(false)
      expect(result.status).toBe(500)
    })

    it('should detect unhealthy service on network error', async () => {
      ;(mcpClient.fetchUrl as any).mockRejectedValueOnce(
        new Error('Connection refused')
      )

      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177/health'
      )

      expect(result.healthy).toBe(false)
      expect(result.status).toBe(0)
    })

    it('should measure response time', async () => {
      ;(mcpClient.fetchUrl as any).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { status: 200, ok: true }
      })

      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177/health'
      )

      expect(result.responseTime).toBeGreaterThanOrEqual(10)
    })

    it('should include timestamp', async () => {
      ;(mcpClient.fetchUrl as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
      })

      const beforeCheck = new Date()
      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177/health'
      )
      const afterCheck = new Date()

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCheck.getTime()
      )
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(
        afterCheck.getTime()
      )
    })

    it('should consider 3xx responses as healthy', async () => {
      ;(mcpClient.fetchUrl as any).mockResolvedValueOnce({
        status: 302,
        ok: true,
      })

      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177'
      )

      expect(result.healthy).toBe(true)
    })

    it('should handle missing status in response', async () => {
      ;(mcpClient.fetchUrl as any).mockResolvedValueOnce({})

      const result = await serviceMonitor.performHealthCheck(
        'http://localhost:5177'
      )

      expect(result.status).toBe(200) // Default status
    })
  })

  describe('restartService', () => {
    it('should return false (not implemented)', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await serviceMonitor.restartService('test-service')

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not implemented')
      )
    })
  })
})
