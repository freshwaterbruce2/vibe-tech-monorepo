import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { RouteErrorBoundary } from '../RouteErrorBoundary'

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test route error')
  }
  return <div>Route content rendered successfully</div>
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for tests (React logs errors caught by ErrorBoundary)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==================== Basic Rendering Tests ====================

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError shouldThrow={false} />
        </RouteErrorBoundary>
      )

      expect(screen.getByText('Route content rendered successfully')).toBeInTheDocument()
    })

    it('renders multiple children correctly', () => {
      render(
        <RouteErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </RouteErrorBoundary>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })

    it('renders nested components correctly', () => {
      render(
        <RouteErrorBoundary>
          <div>
            <span>Nested content</span>
          </div>
        </RouteErrorBoundary>
      )

      expect(screen.getByText('Nested content')).toBeInTheDocument()
    })
  })

  // ==================== Error Handling Tests ====================

  describe('Error Handling', () => {
    it('catches errors from child components', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      // Should show fallback UI instead of crashing
      expect(screen.getByText(/this page encountered an error/i)).toBeInTheDocument()
    })

    it('displays error message', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      expect(
        screen.getByText(/the error has been logged and we're working on a fix/i)
      ).toBeInTheDocument()
    })

    it('logs the error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      // Check that console.error was called (React and our custom onError)
      expect(consoleSpy).toHaveBeenCalled()

      // Find our specific error log
      const calls = consoleSpy.mock.calls
      const routeErrorCall = calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('Route error:')
      )
      expect(routeErrorCall).toBeDefined()
    })
  })

  // ==================== Fallback UI Tests ====================

  describe('Fallback UI', () => {
    it('shows error title', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      expect(
        screen.getByRole('heading', { name: /this page encountered an error/i })
      ).toBeInTheDocument()
    })

    it('shows return to dashboard link', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      const link = screen.getByRole('link', { name: /return to dashboard/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('fallback UI has centered layout', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      // Check for the containing div with text-center class
      const container = screen.getByText(/this page encountered an error/i).closest('div')
      expect(container).toHaveClass('text-center')
    })
  })

  // ==================== Integration with ErrorBoundary ====================

  describe('ErrorBoundary Integration', () => {
    it('wraps children with ErrorBoundary', () => {
      // The RouteErrorBoundary should use ErrorBoundary internally
      // This is verified by checking that it catches errors properly
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      // If ErrorBoundary is working, we should see the fallback
      expect(screen.getByText(/this page encountered an error/i)).toBeInTheDocument()
    })

    it('passes onError callback to ErrorBoundary', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      // onError should have logged "Route error:"
      const routeErrorCalls = consoleSpy.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('Route error:')
      )
      expect(routeErrorCalls.length).toBeGreaterThan(0)
    })
  })

  // ==================== Recovery Tests ====================

  describe('Error Recovery', () => {
    it('user can navigate away via dashboard link', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )

      const link = screen.getByRole('link', { name: /return to dashboard/i })

      // Verify link properties for navigation
      expect(link).toHaveAttribute('href', '/')
      expect(link).toHaveClass('text-blue-600')
    })
  })

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('handles errors in deeply nested components', () => {
      const DeepNestedError = () => {
        return (
          <div>
            <div>
              <div>
                <ThrowError />
              </div>
            </div>
          </div>
        )
      }

      render(
        <RouteErrorBoundary>
          <DeepNestedError />
        </RouteErrorBoundary>
      )

      expect(screen.getByText(/this page encountered an error/i)).toBeInTheDocument()
    })

    it('handles errors thrown during render', () => {
      const ErrorDuringRender = () => {
        throw new Error('Error during render')
      }

      render(
        <RouteErrorBoundary>
          <ErrorDuringRender />
        </RouteErrorBoundary>
      )

      expect(screen.getByText(/this page encountered an error/i)).toBeInTheDocument()
    })

    it('handles string children', () => {
      render(<RouteErrorBoundary>Simple text content</RouteErrorBoundary>)

      expect(screen.getByText('Simple text content')).toBeInTheDocument()
    })

    it('handles null children', () => {
      render(<RouteErrorBoundary>{null}</RouteErrorBoundary>)

      // Should render without crashing
      expect(document.body).toBeInTheDocument()
    })

    it('handles undefined children', () => {
      render(<RouteErrorBoundary>{undefined}</RouteErrorBoundary>)

      // Should render without crashing
      expect(document.body).toBeInTheDocument()
    })
  })
})
