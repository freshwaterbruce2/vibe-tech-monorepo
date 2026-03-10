import React from 'react';
import { TenantAuth } from '@/components/tenant/TenantAuth';
import { useTenantAuth } from '@/contexts/TenantAuthContext';
import { Navigate } from 'react-router-dom';

const TenantAuthPage: React.FC = () => {
  const { isAuthenticated } = useTenantAuth();

  // If already authenticated, redirect to main page
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <TenantAuth />
    </div>
  );
};

export default TenantAuthPage;