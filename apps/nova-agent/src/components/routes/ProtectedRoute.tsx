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
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-label="Loading authentication"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
