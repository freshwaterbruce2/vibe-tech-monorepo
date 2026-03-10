import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tenantApi, TenantCredentials, TenantInfo } from '@/services/tenantApiService';
import { warehouseConfig } from '@/config/warehouse';
import { apiFetch } from '@/utils/api';

interface TenantAuthContextType {
  isAuthenticated: boolean;
  tenantInfo: TenantInfo | null;
  credentials: TenantCredentials | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: TenantCredentials) => Promise<boolean>;
  logout: () => void;
  refreshTenantInfo: () => Promise<void>;
  clearError: () => void;
}

const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

interface TenantAuthProviderProps {
  children: ReactNode;
}

export const TenantAuthProvider: React.FC<TenantAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [credentials, setCredentials] = useState<TenantCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const savedCredentials = tenantApi.getCredentials();
        if (savedCredentials && tenantApi.isAuthenticated()) {
          setCredentials(savedCredentials);
          setIsAuthenticated(true);

          // Try to load tenant info and config
          await loadTenantInfo();
          await warehouseConfig.refreshFromApi();
        }
      } catch (error) {
        console.error('Failed to initialize tenant auth:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loadTenantInfo = async () => {
    try {
      const response = await tenantApi.getTenantConfig();
      if (response.success && response.tenant) {
        setTenantInfo(response.tenant);
      }
    } catch (error) {
      console.error('Failed to load tenant info:', error);
      throw error;
    }
  };

  const login = async (newCredentials: TenantCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Set credentials in the API service
      tenantApi.setCredentials(newCredentials);

      // Test the credentials by trying to load tenant config
      const response = await tenantApi.getTenantConfig();

      if (response.success) {
        setCredentials(newCredentials);
        setTenantInfo(response.tenant);
        setIsAuthenticated(true);

        // Refresh warehouse config from API
        await warehouseConfig.refreshFromApi();

        console.log('Successfully authenticated with tenant:', response.tenant.name);
        return true;
      } else {
        throw new Error('Failed to authenticate with tenant API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);

      // Clear invalid credentials
      tenantApi.clearCredentials();
      setCredentials(null);
      setTenantInfo(null);
      setIsAuthenticated(false);

      console.error('Tenant authentication failed:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    tenantApi.clearCredentials();
    setCredentials(null);
    setTenantInfo(null);
    setIsAuthenticated(false);
    setError(null);

    // Reset warehouse config to local/default
    warehouseConfig.resetToDefault();

    console.log('Logged out from tenant');
  };

  const refreshTenantInfo = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      await loadTenantInfo();
      await warehouseConfig.refreshFromApi();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh tenant info';
      setError(errorMessage);
      console.error('Failed to refresh tenant info:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue: TenantAuthContextType = {
    isAuthenticated,
    tenantInfo,
    credentials,
    isLoading,
    error,
    login,
    logout,
    refreshTenantInfo,
    clearError
  };

  return (
    <TenantAuthContext.Provider value={contextValue}>
      {children}
    </TenantAuthContext.Provider>
  );
};

export const useTenantAuth = (): TenantAuthContextType => {
  const context = useContext(TenantAuthContext);
  if (context === undefined) {
    throw new Error('useTenantAuth must be used within a TenantAuthProvider');
  }
  return context;
};

// Helper hook for tenant-specific operations
export const useTenantOperations = () => {
  const auth = useTenantAuth();

  const checkSubscriptionLimits = async () => {
    if (!auth.isAuthenticated) return null;

    try {
      const response = await tenantApi.getTenantSubscription();
      return response;
    } catch (error) {
      console.error('Failed to check subscription limits:', error);
      return null;
    }
  };

  const syncTenantData = async (data: { doorEntries?: any[]; palletData?: any; users?: any[] }) => {
    if (!auth.isAuthenticated) return false;

    try {
      const response = await tenantApi.updateTenantData(data);
      return response.success;
    } catch (error) {
      console.error('Failed to sync tenant data:', error);
      return false;
    }
  };

  const getTenantData = async () => {
    if (!auth.isAuthenticated) return null;

    try {
      const response = await tenantApi.getTenantData();
      return response.data;
    } catch (error) {
      console.error('Failed to get tenant data:', error);
      return null;
    }
  };

  const getPaymentStatus = async () => {
    if (!auth.isAuthenticated || !auth.credentials?.apiKey) return null;

    try {
      const response = await apiFetch('/api/payment/status', {
        headers: {
          'Authorization': `Bearer ${auth.credentials.apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success ? data : null;
      }
    } catch (error) {
      console.error('Failed to get payment status:', error);
    }
    return null;
  };

  const getSubscriptionPlans = async () => {
    try {
      const response = await apiFetch('/api/payment/plans');
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.plans : [];
      }
    } catch (error) {
      console.error('Failed to get subscription plans:', error);
    }
    return [];
  };

  const createCheckoutSession = async (planId: string, redirectUrl?: string) => {
    if (!auth.isAuthenticated || !auth.credentials?.apiKey) return null;

    try {
      const response = await apiFetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.credentials.apiKey}`
        },
        body: JSON.stringify({
          planId,
          redirectUrl: redirectUrl ?? `${window.location.origin}/settings?upgraded=true`
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.success ? data : null;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
    return null;
  };

  const upgradeSubscription = async (planId: string) => {
    try {
      const checkoutSession = await createCheckoutSession(planId);
      if (checkoutSession?.checkoutUrl) {
        // Redirect to Square checkout
        window.location.href = checkoutSession.checkoutUrl;
        return true;
      }
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
    }
    return false;
  };

  return {
    checkSubscriptionLimits,
    syncTenantData,
    getTenantData,
    analyzeShipment: tenantApi.analyzeShipment.bind(tenantApi),
    getPaymentStatus,
    getSubscriptionPlans,
    createCheckoutSession,
    upgradeSubscription
  };
};