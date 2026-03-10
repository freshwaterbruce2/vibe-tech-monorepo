import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from './ProjectCard'
import type { Project } from '../../types'

// Mock lucide-react icons - use importOriginal to include all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  const MockIcon = () => null
  return {
    ...actual,
    ExternalLink: MockIcon,
    FolderGit2: MockIcon,
    Tag: MockIcon,
    Target: MockIcon,
  }
})

describe('ProjectCard', () => {
  const baseProject: Project = {
    name: 'test-app',
    root: 'apps/test-app',
    targets: {
      build: { executor: 'nx:build' },
      test: { executor: 'nx:test' },
    },
    tags: ['react', 'typescript'],
  }

  it('should render project name and path', () => {
    render(<ProjectCard project={baseProject} />)

    expect(screen.getByText('test-app')).toBeInTheDocument()
    expect(screen.getByText('apps/test-app')).toBeInTheDocument()
  })

  it('should display healthy status for valid project', () => {
    const { container } = render(<ProjectCard project={baseProject} />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-emerald-500/20')
  })

  it('should display warning status for project without targets', () => {
    const projectWithoutTargets: Project = {
      ...baseProject,
      targets: {},
    }

    const { container } = render(<ProjectCard project={projectWithoutTargets} />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-amber-500/20')
  })

  it('should display critical status for deprecated projects', () => {
    const deprecatedProject: Project = {
      ...baseProject,
      tags: ['deprecated'],
    }

    const { container } = render(<ProjectCard project={deprecatedProject} />)

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-red-500/20')
  })

  it('should display available targets', () => {
    render(<ProjectCard project={baseProject} />)

    expect(screen.getByText('Available Targets:')).toBeInTheDocument()
    expect(screen.getByText('build')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('should handle button click', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<ProjectCard project={baseProject} />)

    const button = screen.getByRole('button', { name: /Open test-app project directory/i })
    fireEvent.click(button)

    expect(consoleSpy).toHaveBeenCalledWith('Open apps/test-app')

    consoleSpy.mockRestore()
  })

  it('should display up to 3 tags', () => {
    render(<ProjectCard project={baseProject} />)

    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })
})
