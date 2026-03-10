import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from './LoadingSpinner'

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Loader2: ({ className }: { className?: string }) => (
      <div className={className || 'animate-spin'} data-testid="loader" />
    )
  }
})

describe('LoadingSpinner', () => {
  it('should render loading spinner', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should display message when provided', () => {
    render(<LoadingSpinner message="Loading data..." />)
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('should not display message when not provided', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.textContent).toBe('')
  })

  it('should apply small size classes', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner?.className).toContain('h-4')
    expect(spinner?.className).toContain('w-4')
  })

  it('should apply medium size classes (default)', () => {
    const { container } = render(<LoadingSpinner size="md" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner?.className).toContain('h-8')
    expect(spinner?.className).toContain('w-8')
  })

  it('should apply large size classes', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner?.className).toContain('h-12')
    expect(spinner?.className).toContain('w-12')
  })

  it('should have animate-spin class', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should be centered by default', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild?.className).toContain('flex')
    expect(container.firstChild?.className).toContain('items-center')
    expect(container.firstChild?.className).toContain('justify-center')
  })

  it('should display message below spinner when both provided', () => {
    const { container } = render(<LoadingSpinner size="lg" message="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
