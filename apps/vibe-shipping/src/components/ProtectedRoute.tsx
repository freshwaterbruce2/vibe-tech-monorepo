import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Check if user is authenticated
  const isAuthenticated =
    localStorage.getItem('tenantApiKey') ||
    localStorage.getItem('warehouse-customized');

  if (!isAuthenticated) {
    // Redirect to landing page if not authenticated
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;