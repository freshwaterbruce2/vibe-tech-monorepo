import { useAdmin } from '@/context/AdminContext';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that redirects unauthenticated users to /admin (login page).
 * Must be used within an AdminProvider.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAdmin } = useAdmin();

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
