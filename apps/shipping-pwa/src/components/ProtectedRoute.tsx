import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Check if user is authenticated
  const isAuthenticated =
    window.electronAPI?.store.get('tenantApiKey') ||
    window.electronAPI?.store.get('warehouse-customized');

  if (!isAuthenticated) {
    // Redirect to landing page if not authenticated
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;