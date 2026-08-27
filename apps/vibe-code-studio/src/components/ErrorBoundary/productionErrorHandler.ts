/**
 * Imperative error-reporting hook that pairs with ProductionErrorBoundary.
 * Lives in a sibling .ts module (not the component file) so the component
 * keeps react-refresh compatibility (only-export-components).
 */
import { telemetry } from '../../services/TelemetryService';

export function useErrorHandler() {
  return (error: Error, errorInfo?: Record<string, unknown>) => {
    telemetry.trackError(error, errorInfo, 'high');
    throw error; // Re-throw to be caught by error boundary
  };
}
