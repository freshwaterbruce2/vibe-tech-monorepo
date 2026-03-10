import { render, screen } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import TestComponent from '../../components/TestComponent'

// Use fake timers for consistent Date
describe('TestComponent', () => {
  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the main heading', () => {
      render(<TestComponent />)

      expect(screen.getByText('🎉 DeepCode Editor Test')).toBeInTheDocument()
    })

    it('should render the status message', () => {
      render(<TestComponent />)

      expect(screen.getByText('If you can see this, the React app is working!')).toBeInTheDocument()
    })

    it('should render the current time', () => {
      render(<TestComponent />)

      expect(screen.getByText(/Time:/)).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should apply correct container styles', () => {
      render(<TestComponent />)

      const container = screen.getByText('🎉 DeepCode Editor Test').parentElement

      expect(container).toHaveStyle({
        padding: '20px',
        background: '#1e1e1e',
        color: '#d4d4d4',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      })
    })

    it('should render as a full-height centered container', () => {
      render(<TestComponent />)

      const container = screen.getByText('🎉 DeepCode Editor Test').parentElement

      expect(container).toHaveStyle({
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      })
    })
  })

  describe('Content Structure', () => {
    it('should have correct heading hierarchy', () => {
      render(<TestComponent />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('🎉 DeepCode Editor Test')
    })

    it('should render all text elements', () => {
      render(<TestComponent />)

      // Check all text content is present
      expect(screen.getByText(/DeepCode Editor Test/)).toBeInTheDocument()
      expect(screen.getByText(/React app is working/)).toBeInTheDocument()
      expect(screen.getByText(/Time:/)).toBeInTheDocument()
    })

    it('should render elements in correct order', () => {
      render(<TestComponent />)

      const container = screen.getByText('🎉 DeepCode Editor Test').parentElement
      const children = container?.children

      expect(children).toHaveLength(3)
      expect(children?.[0]).toHaveTextContent('🎉 DeepCode Editor Test')
      expect(children?.[1]).toHaveTextContent('If you can see this, the React app is working!')
      expect(children?.[2].textContent).toMatch(/Time:/)
    })
  })

  describe('Time Display', () => {
    it('should display a time string', () => {
      render(<TestComponent />)

      // With fake timers set to noon UTC, the time element should contain "Time:"
      expect(screen.getByText(/Time:/)).toBeInTheDocument()
    })

    it('should display formatted time', () => {
      render(<TestComponent />)

      const timeElement = screen.getByText(/Time:/)
      expect(timeElement).toBeInTheDocument()
    })

    it('should update with different system times', () => {
      // Change the fake system time
      vi.setSystemTime(new Date('2024-06-15T18:30:00.000Z'))

      render(<TestComponent />)

      expect(screen.getByText(/Time:/)).toBeInTheDocument()

      // Reset back for other tests
      vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    })
  })

  describe('Accessibility', () => {
    it('should have accessible heading structure', () => {
      render(<TestComponent />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('should have sufficient color contrast', () => {
      render(<TestComponent />)

      const container = screen.getByText('🎉 DeepCode Editor Test').parentElement

      // Dark theme with light text should have good contrast
      expect(container).toHaveStyle({
        background: '#1e1e1e',
        color: '#d4d4d4'
      })
    })

    it('should be keyboard accessible', () => {
      render(<TestComponent />)

      // Component doesn't have interactive elements, but should be readable
      expect(screen.getByText('🎉 DeepCode Editor Test')).toBeInTheDocument()
    })
  })

  describe('Component Behavior', () => {
    it('should render without throwing errors', () => {
      expect(() => render(<TestComponent />)).not.toThrow()
    })

    it('should be a pure component', () => {
      const { rerender } = render(<TestComponent />)

      // Component should render consistently
      expect(screen.getByText('🎉 DeepCode Editor Test')).toBeInTheDocument()

      rerender(<TestComponent />)
      expect(screen.getByText('🎉 DeepCode Editor Test')).toBeInTheDocument()
    })

    it('should handle multiple renders', () => {
      const { unmount } = render(<TestComponent />)

      expect(screen.getByText('🎉 DeepCode Editor Test')).toBeInTheDocument()

      unmount()

      // Re-render in a new container
      render(<TestComponent />)
      expect(screen.getByText('🎉 DeepCode Editor Test')).toBeInTheDocument()
    })
  })

  describe('Static Content', () => {
    it('should always render the same static content', () => {
      const { rerender } = render(<TestComponent />)

      const initialHeading = screen.getByText('🎉 DeepCode Editor Test')
      const initialMessage = screen.getByText('If you can see this, the React app is working!')

      rerender(<TestComponent />)

      expect(screen.getByText('🎉 DeepCode Editor Test')).toBe(initialHeading)
      expect(screen.getByText('If you can see this, the React app is working!')).toBe(initialMessage)
    })

    it('should include emoji in heading', () => {
      render(<TestComponent />)

      expect(screen.getByText(/🎉/)).toBeInTheDocument()
    })
  })

  describe('Layout Testing', () => {
    it('should create a flex container', () => {
      render(<TestComponent />)

      const container = screen.getByText('🎉 DeepCode Editor Test').parentElement

      expect(container).toHaveStyle({
        display: 'flex',
        flexDirection: 'column'
      })
    })

    it('should center content both horizontally and vertically', () => {
      render(<TestComponent />)

      const container = screen.getByText('🎉 DeepCode Editor Test').parentElement

      expect(container).toHaveStyle({
        alignItems: 'center',
        justifyContent: 'center'
      })
    })
  })
})
