import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { ProjectsTab } from './ProjectsTab'
import * as useProjectsHook from '../../hooks/useProjects'

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  const MockIcon = () => null
  return { ...actual, Filter: MockIcon, FolderGit2: MockIcon, RefreshCw: MockIcon, Search: MockIcon }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('ProjectsTab', () => {
  const mockProjectsData = {
    projects: { app1: { name: 'app1', root: 'apps/app1', targets: { build: { executor: 'nx:build' } }, tags: ['react'] } },
    categorizedProjects: { apps: [{ name: 'app1', root: 'apps/app1', targets: { build: { executor: 'nx:build' } }, tags: ['react'] }] },
    affectedProjects: undefined,
    metrics: { totalProjects: 1, healthyProjects: 1, warningProjects: 0, criticalProjects: 0, totalDependencies: 0, configIssues: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({ ...mockProjectsData, isLoading: true })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    expect(screen.getByText('Loading projects data...')).toBeInTheDocument()
  })

  it('should display error state with Error object', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      error: new Error('Network error'),
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    expect(screen.getByText('Error Loading Projects')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should display error state with non-Error object', () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      error: 'String error' as any,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    expect(screen.getByText('Unknown error')).toBeInTheDocument()
  })

  it('should call refetch when retry button is clicked', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      error: new Error('Test error'),
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('should call refetch on Enter key in retry button', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      error: new Error('Test error'),
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const button = screen.getByRole('button', { name: /retry/i })
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(refetch).toHaveBeenCalled()
  })

  it('should call refetch on Space key in retry button', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      error: new Error('Test error'),
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const button = screen.getByRole('button', { name: /retry/i })
    fireEvent.keyDown(button, { key: ' ' })
    expect(refetch).toHaveBeenCalled()
  })

  it('should filter projects by search', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue(mockProjectsData)
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const searchInput = screen.getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'app1' } })
    await waitFor(() => { expect(screen.getByText('app1')).toBeInTheDocument() })
  })

  it('should clear search on Escape key', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue(mockProjectsData)
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const searchInput = screen.getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'test' } })
    expect(searchInput).toHaveValue('test')
    fireEvent.keyDown(searchInput, { key: 'Escape' })
    expect(searchInput).toHaveValue('')
  })

  it('should filter by status', async () => {
    const projectWithWarning = { name: 'warning-app', root: 'apps/warning', targets: {}, tags: [] }
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      projects: {
        app1: mockProjectsData.projects.app1,
        'warning-app': projectWithWarning,
      },
      categorizedProjects: {
        apps: [mockProjectsData.projects.app1, projectWithWarning],
      },
      metrics: { ...mockProjectsData.metrics, totalProjects: 2, warningProjects: 1 },
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })

    const filterSelect = screen.getByRole('combobox', { name: /filter projects by status/i })
    fireEvent.change(filterSelect, { target: { value: 'warning' } })

    await waitFor(() => {
      expect(screen.getByText('warning-app')).toBeInTheDocument()
    })
  })

  it('should display affected projects alert when present', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      affectedProjects: { projects: ['app1', 'app2'], tasks: ['build', 'test'] },
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('2 Affected Projects')).toBeInTheDocument()
      expect(screen.getByText(/These projects have changes since main branch/)).toBeInTheDocument()
    })
  })

  it('should display singular affected project text', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      affectedProjects: { projects: ['app1'], tasks: ['build'] },
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('1 Affected Project')).toBeInTheDocument()
    })
  })

  it('should display empty state when no projects match filter', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      projects: {},
      categorizedProjects: {},
      metrics: { ...mockProjectsData.metrics, totalProjects: 0 },
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('No Projects Found')).toBeInTheDocument()
      expect(screen.getByText('No projects detected in workspace')).toBeInTheDocument()
    })
  })

  it('should display filter hint when search/filter active and no results', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue(mockProjectsData)
    render(<ProjectsTab />, { wrapper: createWrapper() })

    const searchInput = screen.getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
    })
  })

  it('should display singular project text for one project', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue(mockProjectsData)
    render(<ProjectsTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Monitoring 1 project across the workspace/)).toBeInTheDocument()
    })
  })

  it('should display plural projects text for multiple projects', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      projects: {
        app1: mockProjectsData.projects.app1,
        app2: { name: 'app2', root: 'apps/app2', targets: { build: {} }, tags: [] },
      },
      metrics: { ...mockProjectsData.metrics, totalProjects: 2 },
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Monitoring 2 projects across the workspace/)).toBeInTheDocument()
    })
  })

  it('should call refetch on refresh button click', async () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button', { name: /refresh project data/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('should call refetch on Enter key in refresh button', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const button = screen.getByRole('button', { name: /refresh project data/i })
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(refetch).toHaveBeenCalled()
  })

  it('should not refetch on non-Enter/Space key', () => {
    const refetch = vi.fn()
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue({
      ...mockProjectsData,
      error: new Error('Test'),
      refetch,
    })
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const button = screen.getByRole('button', { name: /retry/i })
    fireEvent.keyDown(button, { key: 'Tab' })
    expect(refetch).not.toHaveBeenCalled()
  })

  it('should filter by root path in search', async () => {
    vi.spyOn(useProjectsHook, 'useProjects').mockReturnValue(mockProjectsData)
    render(<ProjectsTab />, { wrapper: createWrapper() })
    const searchInput = screen.getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'apps/app1' } })
    await waitFor(() => {
      expect(screen.getByText('app1')).toBeInTheDocument()
    })
  })
})