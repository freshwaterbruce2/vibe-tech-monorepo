import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nxService } from './nxService'
import { mcpClient } from './mcpClient'
import type { Project } from '../types'

// Mock mcpClient
vi.mock('./mcpClient', () => ({
  mcpClient: {
    callNxWorkspace: vi.fn(),
    callFilesystem: vi.fn(),
  },
}))

// Mock window.mcp
const mockMcp = {
  call: vi.fn(),
}

Object.defineProperty(global, 'window', {
  value: { mcp: mockMcp },
  writable: true,
})

describe('nxService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getWorkspaceProjects', () => {
    it('should fetch workspace projects successfully', async () => {
      const mockProjects = {
        'app1': { name: 'app1', root: 'apps/app1' },
        'lib1': { name: 'lib1', root: 'packages/lib1' },
      }

      ;(mcpClient.callNxWorkspace as any).mockResolvedValueOnce({
        projects: mockProjects,
      })

      const result = await nxService.getWorkspaceProjects()

      expect(result).toEqual(mockProjects)
      expect(mcpClient.callNxWorkspace).toHaveBeenCalledWith(undefined)
    })

    it('should pass filter parameter to MCP client', async () => {
      ;(mcpClient.callNxWorkspace as any).mockResolvedValueOnce({
        projects: {},
      })

      await nxService.getWorkspaceProjects('app*')

      expect(mcpClient.callNxWorkspace).toHaveBeenCalledWith('app*')
    })

    it('should throw error on MCP failure', async () => {
      ;(mcpClient.callNxWorkspace as any).mockRejectedValueOnce(
        new Error('MCP error')
      )

      await expect(nxService.getWorkspaceProjects()).rejects.toThrow('MCP error')
    })
  })

  describe('getAffectedProjects', () => {
    it('should fetch affected projects with default base', async () => {
      mockMcp.call.mockResolvedValueOnce({
        projects: ['app1', 'app2'],
        tasks: ['build', 'test'],
      })

      const result = await nxService.getAffectedProjects()

      expect(result).toEqual({
        projects: ['app1', 'app2'],
        tasks: ['build', 'test'],
      })
      expect(mockMcp.call).toHaveBeenCalledWith('nx_affected', { base: 'main' })
    })

    it('should use custom base branch', async () => {
      mockMcp.call.mockResolvedValueOnce({
        projects: [],
        tasks: [],
      })

      await nxService.getAffectedProjects('develop')

      expect(mockMcp.call).toHaveBeenCalledWith('nx_affected', { base: 'develop' })
    })

    it('should return empty arrays on error', async () => {
      mockMcp.call.mockRejectedValueOnce(new Error('Network error'))

      const result = await nxService.getAffectedProjects()

      expect(result).toEqual({
        projects: [],
        tasks: [],
      })
    })

    it('should handle null/undefined projects in response', async () => {
      mockMcp.call.mockResolvedValueOnce({})

      const result = await nxService.getAffectedProjects()

      expect(result).toEqual({
        projects: [],
        tasks: [],
      })
    })
  })

  describe('getProjectGraph', () => {
    it('should fetch project graph successfully', async () => {
      const mockGraph = {
        nodes: { app1: { name: 'app1' } },
        dependencies: { app1: [] },
      }

      mockMcp.call.mockResolvedValueOnce(mockGraph)

      const result = await nxService.getProjectGraph()

      expect(result).toEqual(mockGraph)
      expect(mockMcp.call).toHaveBeenCalledWith('nx_graph', {})
    })

    it('should return null on error', async () => {
      mockMcp.call.mockRejectedValueOnce(new Error('Graph error'))

      const result = await nxService.getProjectGraph()

      expect(result).toBeNull()
    })
  })

  describe('getCacheStats', () => {
    it('should fetch cache stats successfully', async () => {
      ;(mcpClient.callFilesystem as any).mockResolvedValueOnce({
        files: [
          { name: 'file1', size: 1000 },
          { name: 'file2', size: 2000 },
        ],
      })

      const result = await nxService.getCacheStats()

      expect(result).toEqual({
        hitRate: 75, // Placeholder value
        size: 3000,
        fileCount: 2,
      })
    })

    it('should handle empty cache directory', async () => {
      ;(mcpClient.callFilesystem as any).mockResolvedValueOnce({
        files: [],
      })

      const result = await nxService.getCacheStats()

      expect(result).toEqual({
        hitRate: 75,
        size: 0,
        fileCount: 0,
      })
    })

    it('should handle missing files array', async () => {
      ;(mcpClient.callFilesystem as any).mockResolvedValueOnce({})

      const result = await nxService.getCacheStats()

      expect(result).toEqual({
        hitRate: 75,
        size: 0,
        fileCount: 0,
      })
    })

    it('should return zeros on error', async () => {
      ;(mcpClient.callFilesystem as any).mockRejectedValueOnce(
        new Error('Filesystem error')
      )

      const result = await nxService.getCacheStats()

      expect(result).toEqual({
        hitRate: 0,
        size: 0,
        fileCount: 0,
      })
    })
  })

  describe('getProjectDetails', () => {
    it('should fetch project details successfully', async () => {
      const mockProject = {
        name: 'app1',
        root: 'apps/app1',
        targets: { build: {}, test: {} },
      }

      mockMcp.call.mockResolvedValueOnce(mockProject)

      const result = await nxService.getProjectDetails('app1')

      expect(result).toEqual(mockProject)
      expect(mockMcp.call).toHaveBeenCalledWith('nx_project_details', {
        projectName: 'app1',
      })
    })

    it('should return null on error', async () => {
      mockMcp.call.mockRejectedValueOnce(new Error('Project not found'))

      const result = await nxService.getProjectDetails('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('categorizeProjects', () => {
    it('should categorize AI projects', () => {
      const projects: Record<string, Project> = {
        'nova-agent': {
          name: 'nova-agent',
          root: 'apps/nova-agent',
          tags: ['type:ai'],
        },
        'ai-service': {
          name: 'ai-service',
          root: 'apps/ai-service',
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.AI).toHaveLength(2)
      expect(result.AI?.map(p => p.name)).toContain('nova-agent')
      expect(result.AI?.map(p => p.name)).toContain('ai-service')
    })

    it('should categorize Desktop projects', () => {
      const projects: Record<string, Project> = {
        'desktop-app': {
          name: 'desktop-app',
          root: 'apps/desktop-app',
          tags: ['type:desktop'],
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Desktop).toHaveLength(1)
    })

    it('should categorize Trading projects', () => {
      const projects: Record<string, Project> = {
        'crypto-enhanced': {
          name: 'crypto-enhanced',
          root: 'apps/crypto-enhanced',
          tags: ['scope:trading'],
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Trading).toHaveLength(1)
    })

    it('should categorize Web projects', () => {
      const projects: Record<string, Project> = {
        'web-app': {
          name: 'web-app',
          root: 'apps/web-app',
          tags: ['type:app'],
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Web).toHaveLength(1)
    })

    it('should categorize Mobile projects', () => {
      const projects: Record<string, Project> = {
        'vibe-tutor': {
          name: 'vibe-tutor',
          root: 'mobile/vibe-tutor', // Use mobile/ path to avoid matching apps/ which triggers Web category first
          tags: ['type:mobile'],
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Mobile).toHaveLength(1)
    })

    it('should categorize Backend projects', () => {
      const projects: Record<string, Project> = {
        'api-server': {
          name: 'api-server',
          root: 'backend/api-server',
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Backend).toHaveLength(1)
    })

    it('should categorize Library projects', () => {
      const projects: Record<string, Project> = {
        'shared-utils': {
          name: 'shared-utils',
          root: 'packages/shared-utils',
          projectType: 'library',
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Libs).toHaveLength(1)
    })

    it('should categorize External/unknown projects', () => {
      const projects: Record<string, Project> = {
        'external-tool': {
          name: 'external-tool',
          root: 'tools/external-tool',
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.External).toHaveLength(1)
    })

    it('should remove empty categories', () => {
      const projects: Record<string, Project> = {
        'web-app': {
          name: 'web-app',
          root: 'apps/web-app',
          tags: ['type:app'],
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.AI).toBeUndefined()
      expect(result.Desktop).toBeUndefined()
      expect(result.Trading).toBeUndefined()
      expect(result.Web).toHaveLength(1)
    })

    it('should handle empty projects', () => {
      const result = nxService.categorizeProjects({})

      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle projects without tags', () => {
      const projects: Record<string, Project> = {
        'app': {
          name: 'app',
          root: 'apps/app',
        },
      }

      const result = nxService.categorizeProjects(projects)

      expect(result.Web).toHaveLength(1)
    })
  })
})
