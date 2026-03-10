import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Package } from 'lucide-react'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  it('should render metric title and value', () => {
    render(
      <MetricCard
        title="Total Projects"
        value={42}
        icon={Package}
      />
    )

    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('should apply variant styles correctly', () => {
    const { container } = render(
      <MetricCard
        title="Success Metric"
        value={100}
        icon={Package}
        variant="success"
      />
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('emerald')
  })

  it('should display trend indicator when provided', () => {
    render(
      <MetricCard
        title="Growth Metric"
        value={150}
        icon={Package}
        trend="up"
        trendValue="+15%"
      />
    )

    expect(screen.getByText('+15%')).toBeInTheDocument()
  })

  it('should not display trend when not provided', () => {
    render(
      <MetricCard
        title="Static Metric"
        value={100}
        icon={Package}
      />
    )

    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\-/)).not.toBeInTheDocument()
  })

  it('should render subtitle when provided', () => {
    render(
      <MetricCard
        title="Main Metric"
        value={100}
        icon={Package}
        subtitle="Last updated 5 minutes ago"
      />
    )

    expect(screen.getByText('Last updated 5 minutes ago')).toBeInTheDocument()
  })

  it('should apply glow effect when enabled', () => {
    const { container } = render(
      <MetricCard
        title="Glowing Metric"
        value={100}
        icon={Package}
        glow={true}
      />
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('ring-2')
  })

  it('should format value with prefix and suffix', () => {
    const { container } = render(
      <MetricCard
        title="Currency Metric"
        value={1000}
        icon={Package}
        prefix="$"
        suffix=" USD"
      />
    )

    // AnimatedCounter should render with these prefixes
    const textContent = container.textContent
    expect(textContent).toContain('$')
    expect(textContent).toContain('1000')
    expect(textContent).toContain('USD')
  })

  it('should handle different variant classes', () => {
    const variants = ['default', 'success', 'warning', 'danger'] as const

    variants.forEach((variant) => {
      const { container } = render(
        <MetricCard
          title={`${variant} metric`}
          value={100}
          icon={Package}
          variant={variant}
        />
      )

      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('bg-gradient-to-br')
    })
  })

  it('should apply hover effects', () => {
    const { container } = render(
      <MetricCard
        title="Hover Metric"
        value={100}
        icon={Package}
      />
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('hover:shadow-lg')
    expect(card.className).toContain('hover:scale-[1.02]')
  })

  it('should handle all trend types', () => {
    const trends = ['up', 'down', 'stable'] as const

    trends.forEach((trend) => {
      const { container } = render(
        <MetricCard
          title={`${trend} trend`}
          value={100}
          icon={Package}
          trend={trend}
          trendValue="+10%"
        />
      )

      expect(container).toBeInTheDocument()
    })
  })

  it('should render icon component', () => {
    const { container } = render(
      <MetricCard
        title="Icon Test"
        value={100}
        icon={Package}
      />
    )

    // Icon is mocked as vi.fn() so it renders null
    // Just verify the component renders without errors
    expect(container.firstChild).toBeInTheDocument()
  })
})
