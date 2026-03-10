import React from 'react';

interface FeatureFlaggedRouteProps {
  flag: string;
  enabledComponent: React.ReactNode;
  disabledComponent: React.ReactNode;
}

/**
 * Lightweight feature-flag route wrapper for the Tauri build.
 * The external SDK (@dev/feature-flags-sdk-react) is not available in
 * this environment, so flags default to enabled.
 */
export const FeatureFlaggedRoute = ({ enabledComponent }: FeatureFlaggedRouteProps) => {
  // Feature flags default to enabled — show the new component
  return <>{enabledComponent}</>;
};
