import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { OverviewTab } from './OverviewTab'
import * as useProjectsHook from '../../hooks/useProjects'

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  const MockIcon = () => null
  return { ...actual, Activity: MockIcon, AlertTriangle: MockIcon, FolderGit2: MockIcon, Package: MockIcon, CheckCircle2: MockIcon, XCircle: MockIcon }
})

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

describe('OverviewTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 0,
        healthyProjects: 0,
        warningProjects: 0,
        criticalProjects: 0,
        totalDependencies: 0,
        configIssues: 0,
      },
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    expect(screen.getByText('Loading workspace data...')).toBeInTheDocument()
  })

  it('should display error state', () => {
    const errorMessage = 'Failed to load workspace data'
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 0,
        healthyProjects: 0,
        warningProjects: 0,
        criticalProjects: 0,
        totalDependencies: 0,
        configIssues: 0,
      },
      isLoading: false,
      error: new Error(errorMessage),
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    expect(screen.getByText('Error Loading Data')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should calculate and display health score correctly', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 10,
        healthyProjects: 8,
        warningProjects: 2,
        criticalProjects: 0,
        totalDependencies: 50,
        configIssues: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Health Score')).toBeInTheDocument()
    })
  })

  it('should display workspace metrics', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 15,
        healthyProjects: 12,
        warningProjects: 2,
        criticalProjects: 1,
        totalDependencies: 75,
        configIssues: 3,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Total Projects')).toBeInTheDocument()
      expect(screen.getByText('Dependencies')).toBeInTheDocument()
      expect(screen.getByText('Config Issues')).toBeInTheDocument()
    })
  })

  it('should handle zero projects gracefully', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 0,
        healthyProjects: 0,
        warningProjects: 0,
        criticalProjects: 0,
        totalDependencies: 0,
        configIssues: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Total Projects')).toBeInTheDocument()
    })
  })

  it('should display cache statistics when available', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: {
        hitRate: 85,
        size: 1048576, // 1MB
        fileCount: 150,
      },
      metrics: {
        totalProjects: 10,
        healthyProjects: 8,
        warningProjects: 1,
        criticalProjects: 1,
        totalDependencies: 50,
        configIssues: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Nx Cache Statistics')).toBeInTheDocument()
      expect(screen.getByText('Hit Rate')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('Cache Size')).toBeInTheDocument()
      expect(screen.getByText('Files Cached')).toBeInTheDocument()
    })
  })

  it('should format bytes correctly for cache size', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: {
        hitRate: 75,
        size: 0, // 0 bytes
        fileCount: 0,
      },
      metrics: {
        totalProjects: 5,
        healthyProjects: 5,
        warningProjects: 0,
        criticalProjects: 0,
        totalDependencies: 20,
        configIssues: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('0 B')).toBeInTheDocument()
    })
  })

  it('should display warning projects count when present', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 10,
        healthyProjects: 7,
        warningProjects: 3,
        criticalProjects: 0,
        totalDependencies: 50,
        configIssues: 2,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Workspace Health')).toBeInTheDocument()
    })
  })

  it('should display critical projects count when present', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 10,
        healthyProjects: 6,
        warningProjects: 2,
        criticalProjects: 2,
        totalDependencies: 50,
        configIssues: 4,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Workspace Health')).toBeInTheDocument()
    })
  })

  it('should display project categories with more than 3 projects', async () => {
    const manyProjects = [
      { name: 'app1', root: 'apps/app1' },
      { name: 'app2', root: 'apps/app2' },
      { name: 'app3', root: 'apps/app3' },
      { name: 'app4', root: 'apps/app4' },
      { name: 'app5', root: 'apps/app5' },
    ]
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {
        apps: manyProjects,
      },
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 5,
        healthyProjects: 5,
        warningProjects: 0,
        criticalProjects: 0,
        totalDependencies: 20,
        configIssues: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Project Categories')).toBeInTheDocument()
      expect(screen.getByText('apps')).toBeInTheDocument()
      expect(screen.getByText(/\+2 more/)).toBeInTheDocument()
    })
  })

  it('should display high health score with glow effect', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 10,
        healthyProjects: 9, // 90% health score > 80%
        warningProjects: 1,
        criticalProjects: 0,
        totalDependencies: 50,
        configIssues: 0,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText('Health Score: 90%')).toBeInTheDocument()
    })
  })

  it('should handle non-Error error objects', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      projects: {},
      categorizedProjects: {},
      affectedProjects: undefined,
      cacheStats: undefined,
      metrics: {
        totalProjects: 0,
        healthyProjects: 0,
        warningProjects: 0,
        criticalProjects: 0,
        totalDependencies: 0,
        configIssues: 0,
      },
      isLoading: false,
      error: 'String error' as any,
      refetch: vi.fn(),
    })

    render(<OverviewTab />, { wrapper: createWrapper() })

    expect(screen.getByText('Error Loading Data')).toBeInTheDocument()
    expect(screen.getByText('Unknown error')).toBeInTheDocument()
  })
})
