import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import ErrorBoundary from '../ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Child component</div>
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Mock window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).location = {
      ...originalLocation,
      href: 'http://localhost:5173',
      reload: vi.fn(),
    }

    // Mock fetch for error reporting
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response)
    global.fetch = mockFetch as unknown as typeof fetch

    // Suppress console.error for tests (React logs errors caught by ErrorBoundary)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).location = originalLocation
    process.env.NODE_ENV = originalNodeEnv
    vi.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Child component')).toBeInTheDocument()
  })

  it('catches errors from child components and displays fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
  })

  it('displays error message and action buttons in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // Check for error message (in development mode section)
    const errorMessages = screen.getAllByText(/error:.*test error/i)
    expect(errorMessages.length).toBeGreaterThan(0)

    // Check for all three action buttons
    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    const goHomeButton = screen.getByRole('button', { name: /go home/i })

    expect(tryAgainButton).toBeInTheDocument()
    expect(reloadButton).toBeInTheDocument()
    expect(goHomeButton).toBeInTheDocument()
  })

  it('tracks error count and warns after more than 2 errors', () => {
    // Create component instance to trigger multiple errors
    const errorTrigger = { shouldError: true }
    const TestComponent = () => {
      if (errorTrigger.shouldError) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    // First error - no warning yet (errorCount = 1)
    expect(screen.queryByText(/multiple errors detected/i)).not.toBeInTheDocument()

    // Reset and trigger second error
    screen.getByRole('button', { name: /try again/i }).click()
    errorTrigger.shouldError = true
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    // Second error - still no warning (errorCount = 2)
    expect(screen.queryByText(/multiple errors detected/i)).not.toBeInTheDocument()

    // Reset and trigger third error
    screen.getByRole('button', { name: /try again/i }).click()
    errorTrigger.shouldError = true
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    // Third error - warning appears (errorCount > 2)
    expect(screen.getByText(/multiple errors detected/i)).toBeInTheDocument()
  })

  it('sends errors to /api/client-errors in production mode', async () => {
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // Wait for async error reporting
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/client-errors',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test error')
        })
      )
    })
  })

  it('shows stack trace details in development mode', () => {
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // In dev mode, error details and stack trace should be visible
    expect(screen.getByText(/error details \(development only\)/i)).toBeInTheDocument()
    expect(screen.getByText(/stack trace/i)).toBeInTheDocument()
  })

  it('resets error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // Error UI should be visible
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    // Click Try Again
    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    tryAgainButton.click()

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    // Child component should render again
    expect(screen.getByText('Child component')).toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('invokes error callback when provided', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error',
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('reloads page when Reload Page button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    reloadButton.click()

    expect(window.location.reload).toHaveBeenCalled()
  })

  it('navigates to home when Go Home button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    const goHomeButton = screen.getByRole('button', { name: /go home/i })
    goHomeButton.click()

    expect(window.location.href).toBe('/')
  })
})
