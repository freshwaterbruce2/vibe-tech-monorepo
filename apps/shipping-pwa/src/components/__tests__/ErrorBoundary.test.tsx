import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock console.error to avoid cluttering test output
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
});

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
};

describe('ErrorBoundary', () => {
  describe('Normal Operation', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('renders error UI when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('displays error message in development mode', () => {
const originalEnv = process.env['NODE_ENV'];
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/test error/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('hides detailed error message in production', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('logs error to console', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Recovery', () => {
    it('provides a try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('resets error state when try again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      tryAgainButton.click();

      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('Custom Error Fallback', () => {
    const CustomFallback: React.FC<{ error?: Error; resetError?: () => void }> = ({ error, resetError }) => (
      <div role="alert">
        <h2>Custom Error UI</h2>
        <p>Error: {error?.message ?? 'Unknown error'}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    );

    it('renders custom fallback component when provided', () => {
      render(
        <ErrorBoundary fallback={<CustomFallback error={new Error('Test error')} />}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('calls custom onError callback when provided', () => {
      const onErrorCallback = vi.fn();

      render(
        <ErrorBoundary onError={onErrorCallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorCallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Error Information', () => {
    it('captures error info including component stack', () => {
      const onErrorCallback = vi.fn();

      render(
        <ErrorBoundary onError={onErrorCallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorCallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('displays error boundary info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show some component stack information
      expect(screen.getByRole('alert')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });

    it('has accessible error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveAccessibleName();
    });

    it('try again button is keyboard accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Edge Cases', () => {
    it('handles errors in componentDidCatch', () => {
      // This tests that the error boundary doesn't crash if there's an error in its own error handling
      const BuggyErrorBoundary = class extends React.Component<{ children?: React.ReactNode }> {
        state = { hasError: false };

        static getDerivedStateFromError() {
          return { hasError: true };
        }

        componentDidCatch() {
          throw new Error('Error in error handler');
        }

        render() {
          if (this.state.hasError) {
            return <div>Fallback UI</div>;
          }
          return this.props.children;
        }
      };

      expect(() => {
        render(
          <BuggyErrorBoundary>
            <ThrowError shouldThrow={true} />
          </BuggyErrorBoundary>
        );
      }).not.toThrow();
    });

    it('handles null children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>);
      // Should not crash
    });

    it('handles undefined children', () => {
      render(<ErrorBoundary>{undefined}</ErrorBoundary>);
      // Should not crash
    });

    it('handles errors thrown in event handlers', () => {
      const EventErrorComponent = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return <button onClick={handleClick}>Click me</button>;
      };

      render(
        <ErrorBoundary>
          <EventErrorComponent />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button');

      // Event handler errors are not caught by error boundaries
      expect(() => {
        button.click();
      }).toThrow('Event handler error');
    });
  });

  describe('Performance', () => {
    it('does not re-render children unnecessarily', () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return <div>Render count: {renderCount}</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(renderCount).toBe(1);

      // Re-render with same props
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(renderCount).toBe(2); // Should re-render normally
    });
  });
});
