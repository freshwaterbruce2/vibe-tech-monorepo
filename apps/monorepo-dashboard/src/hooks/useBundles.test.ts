import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useBundleSizes, useBundleTrends, useBundleAnalysis } from './useBundles'

// Mock fetch globally
global.fetch = vi.fn()

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

describe('useBundleSizes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch bundle sizes successfully', async () => {
    const mockData = [
      {
        project_name: 'app1',
        timestamp: '2026-01-25T12:00:00Z',
        total_size: 1000000,
        gzip_size: 300000,
        chunk_count: 5,
        largest_chunk: 'main.js',
        largest_chunk_size: 500000,
        regression: false,
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    const { result } = renderHook(() => useBundleSizes(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5177/api/bundles/latest'
    )
  })

  it('should handle fetch errors', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const { result } = renderHook(() => useBundleSizes(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toContain('Failed to fetch bundle sizes')
  })

  it('should return loading state initially', () => {
    ;(global.fetch as any).mockImplementation(
      async () => new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useBundleSizes(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useBundleTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch bundle trends with default days', async () => {
    const mockData = [
      {
        project_name: 'app1',
        snapshots: [
          { timestamp: '2026-01-25T12:00:00Z', total_size: 1000000, gzip_size: 300000 },
        ],
        average_size: 1000000,
        trend: 'stable' as const,
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    const { result } = renderHook(() => useBundleTrends(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5177/api/bundles/trends?days=30'
    )
  })

  it('should fetch bundle trends with custom days', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    renderHook(() => useBundleTrends(7), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/bundles/trends?days=7'
      )
    })
  })
})

describe('useBundleAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch bundle analysis for a project', async () => {
    const mockData = {
      project_name: 'app1',
      total_size: 1000000,
      gzip_size: 300000,
      chunk_count: 5,
      chunks: [],
      largest_chunks: [],
      compression_ratio: 0.3,
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    })

    const { result } = renderHook(() => useBundleAnalysis('app1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5177/api/bundles/analysis/app1'
    )
  })

  it('should return null for 404 responses', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const { result } = renderHook(() => useBundleAnalysis('nonexistent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
  })

  it('should not fetch if projectName is empty', () => {
    renderHook(() => useBundleAnalysis(''), {
      wrapper: createWrapper(),
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should URL encode project names', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    renderHook(() => useBundleAnalysis('app with spaces'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5177/api/bundles/analysis/app%20with%20spaces'
      )
    })
  })
})
