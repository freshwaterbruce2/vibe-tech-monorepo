import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface Props {
  children: ReactNode;
}

export function RouteErrorBoundary({ children }: Props) {
  // Note: If using React Router, you can import and use useLocation here
  // import { useLocation } from 'react-router-dom';
  // const location = useLocation();

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error(`Route error:`, error);
      }}
      fallback={
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">
            This page encountered an error
          </h2>
          <p className="text-gray-600 mb-4">
            The error has been logged and we're working on a fix.
          </p>
          <a href="/" className="text-blue-600 hover:underline">
            Return to Dashboard
          </a>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
