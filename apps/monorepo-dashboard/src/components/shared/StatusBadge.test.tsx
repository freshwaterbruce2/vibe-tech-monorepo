import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: vi.fn(() => null),
  AlertTriangle: vi.fn(() => null),
  XCircle: vi.fn(() => null),
}))

describe('StatusBadge', () => {
  describe('Status Variants', () => {
    it('should render healthy status', () => {
      render(<StatusBadge status="healthy" />)
      expect(screen.getByText('Healthy')).toBeInTheDocument()
    })

    it('should render warning status', () => {
      render(<StatusBadge status="warning" />)
      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('should render critical status', () => {
      render(<StatusBadge status="critical" />)
      expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('should render running status', () => {
      render(<StatusBadge status="running" />)
      expect(screen.getByText('Running')).toBeInTheDocument()
    })

    it('should render stopped status', () => {
      render(<StatusBadge status="stopped" />)
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(<StatusBadge status="healthy" size="sm" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-2')
      expect(badge.className).toContain('text-xs')
    })

    it('should apply medium size classes (default)', () => {
      const { container } = render(<StatusBadge status="healthy" size="md" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-3')
      expect(badge.className).toContain('text-sm')
    })

    it('should apply large size classes', () => {
      const { container } = render(<StatusBadge status="healthy" size="lg" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-4')
      expect(badge.className).toContain('text-base')
    })
  })

  describe('Display Options', () => {
    it('should show icon and label by default', () => {
      render(<StatusBadge status="healthy" />)
      expect(screen.getByText('Healthy')).toBeInTheDocument()
    })

    it('should hide label when showLabel is false', () => {
      render(<StatusBadge status="healthy" showLabel={false} />)
      expect(screen.queryByText('Healthy')).not.toBeInTheDocument()
    })
  })

  describe('Color Classes', () => {
    it('should apply emerald colors for healthy status', () => {
      const { container } = render(<StatusBadge status="healthy" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-emerald-500/20')
      expect(badge.className).toContain('text-emerald-400')
    })

    it('should apply amber colors for warning status', () => {
      const { container } = render(<StatusBadge status="warning" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-amber-500/20')
      expect(badge.className).toContain('text-amber-400')
    })

    it('should apply red colors for critical status', () => {
      const { container } = render(<StatusBadge status="critical" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-red-500/20')
      expect(badge.className).toContain('text-red-400')
    })
  })
})
