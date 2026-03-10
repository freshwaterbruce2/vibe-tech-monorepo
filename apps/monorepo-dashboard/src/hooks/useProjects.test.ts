import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useProjects } from './useProjects'
import { nxService } from '../services/nxService'

// Mock nxService
vi.mock('../services/nxService', () => ({
  nxService: {
    getWorkspaceProjects: vi.fn(),
    getAffectedProjects: vi.fn(),
    getCacheStats: vi.fn(),
    categorizeProjects: vi.fn(),
  },
}))

const mockCacheStats = { hitRate: 0, size: 0, fileCount: 0 }

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

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch projects successfully', async () => {
    const mockProjects = {
      app1: {
        name: 'app1',
        root: 'apps/app1',
        targets: { build: { executor: 'nx:build' } },
        tags: ['react'],
      },
    }

    vi.mocked(nxService.getWorkspaceProjects).mockResolvedValue(mockProjects)
    vi.mocked(nxService.getAffectedProjects).mockResolvedValue(['app1'])
    vi.mocked(nxService.getCacheStats).mockResolvedValue({ hitRate: 85, size: 1000, fileCount: 100 })
    vi.mocked(nxService.categorizeProjects).mockReturnValue({ apps: [mockProjects.app1] })

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.projects).toEqual(mockProjects)
    })
  })

  it('should calculate workspace metrics', async () => {
    const mockProjects = {
      app1: { name: 'app1', root: 'apps/app1', targets: {}, tags: [] },
      app2: { name: 'app2', root: 'apps/app2', targets: {}, tags: [] },
    }

    vi.mocked(nxService.getWorkspaceProjects).mockResolvedValue(mockProjects)
    vi.mocked(nxService.getAffectedProjects).mockResolvedValue([])
    vi.mocked(nxService.getCacheStats).mockResolvedValue(mockCacheStats)
    vi.mocked(nxService.categorizeProjects).mockReturnValue({})

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.metrics.totalProjects).toBe(2)
    })
  })

  it('should handle loading state', () => {
    vi.mocked(nxService.getWorkspaceProjects).mockImplementation(
      () => new Promise(() => {})
    )
    vi.mocked(nxService.getAffectedProjects).mockImplementation(
      () => new Promise(() => {})
    )

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle errors', async () => {
    vi.mocked(nxService.getWorkspaceProjects)
      .mockRejectedValueOnce(new Error('Failed to fetch projects'))
      .mockResolvedValue({})
    vi.mocked(nxService.getAffectedProjects).mockResolvedValue([])
    vi.mocked(nxService.getCacheStats).mockResolvedValue(mockCacheStats)

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 5000 })

    expect(result.current.projects).toEqual({})
    expect(nxService.getWorkspaceProjects).toHaveBeenCalled()
  })

  it('should categorize projects', async () => {
    const mockProjects = {
      app1: { name: 'app1', root: 'apps/app1', targets: {}, tags: [] },
    }

    const mockCategorized = {
      apps: [mockProjects.app1],
    }

    vi.mocked(nxService.getWorkspaceProjects).mockResolvedValue(mockProjects)
    vi.mocked(nxService.getAffectedProjects).mockResolvedValue([])
    vi.mocked(nxService.getCacheStats).mockResolvedValue(mockCacheStats)
    vi.mocked(nxService.categorizeProjects).mockReturnValue(mockCategorized)

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.categorizedProjects).toEqual(mockCategorized)
    })
  })

  it('should refetch data', async () => {
    vi.mocked(nxService.getWorkspaceProjects).mockResolvedValue({})
    vi.mocked(nxService.getAffectedProjects).mockResolvedValue([])
    vi.mocked(nxService.getCacheStats).mockResolvedValue(mockCacheStats)
    vi.mocked(nxService.categorizeProjects).mockReturnValue({})

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    result.current.refetch()

    expect(nxService.getWorkspaceProjects).toHaveBeenCalled()
  })
})
