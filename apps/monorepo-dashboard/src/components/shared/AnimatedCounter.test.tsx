import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AnimatedCounter } from './AnimatedCounter'

describe('AnimatedCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should render initial value', () => {
    render(<AnimatedCounter value={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('should animate from 0 to target value', async () => {
    vi.useRealTimers() // Use real timers for this animation test
    const { rerender } = render(<AnimatedCounter value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()

    rerender(<AnimatedCounter value={100} />)

    // Wait for animation to complete (animation duration is typically 500-1000ms)
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should format with decimals', () => {
    render(<AnimatedCounter value={42.567} decimals={2} />)
    expect(screen.getByText('42.57')).toBeInTheDocument()
  })

  it('should display prefix', () => {
    render(<AnimatedCounter value={100} prefix="$" />)
    expect(screen.getByText('$100')).toBeInTheDocument()
  })

  it('should display suffix', () => {
    render(<AnimatedCounter value={100} suffix="%" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('should display both prefix and suffix', () => {
    render(<AnimatedCounter value={100} prefix="$" suffix=" USD" />)
    expect(screen.getByText('$100 USD')).toBeInTheDocument()
  })

  it('should handle negative values', () => {
    render(<AnimatedCounter value={-50} />)
    expect(screen.getByText('-50')).toBeInTheDocument()
  })

  it('should handle zero value', () => {
    render(<AnimatedCounter value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should handle percentage formatting', () => {
    render(<AnimatedCounter value={85.5} decimals={1} suffix="%" />)
    expect(screen.getByText('85.5%')).toBeInTheDocument()
  })
})
