/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch } from '@/utils/api';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'superadmin' | 'admin';
  permissions: string[];
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider = ({ children }: AdminAuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = () => {
      setIsLoading(true);
      setError(null);

      try {
        const savedToken = window.electronAPI?.store.get('admin-token');
        const savedAdmin = window.electronAPI?.store.get('admin-user');

        if (savedToken && savedAdmin) {
          setToken(savedToken);
          setAdmin(JSON.parse(savedAdmin));
          setIsAuthenticated(true);
        }
      } catch (_error) {
        console.error('Failed to initialize admin auth:', _error);
        setError('Failed to initialize authentication');
        clearStoredAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearStoredAuth = () => {
    window.electronAPI?.store.delete('admin-token');
    window.electronAPI?.store.delete('admin-user');
    setToken(null);
    setAdmin(null);
    setIsAuthenticated(false);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store authentication data
        window.electronAPI?.store.set('admin-token', data.token);
        window.electronAPI?.store.set('admin-user', JSON.stringify(data.admin));

        setToken(data.token);
        setAdmin(data.admin);
        setIsAuthenticated(true);

        console.warn('Admin successfully authenticated:', data.admin.username);
        return true;
      } else {
        throw new Error(data.error ?? 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      clearStoredAuth();
      console.error('Admin login failed:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Notify server about logout
      if (token) {
        await apiFetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Admin ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearStoredAuth();
      console.warn('Admin logged out');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    if (admin.permissions.includes('*')) return true;
    return admin.permissions.includes(permission);
  };

  const contextValue: AdminAuthContextType = {
    isAuthenticated,
    admin,
    token,
    isLoading,
    error,
    login,
    logout,
    clearError,
    hasPermission
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

// Hook for making authenticated admin API calls
export const useAdminApi = () => {
  const { token, isAuthenticated } = useAdminAuth();

  const makeRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!isAuthenticated || !token) {
      throw new Error('Admin authentication required');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Admin ${token}`,
      ...options.headers
    };

    return apiFetch(url, {
      ...options,
      headers
    });
  };

  const get = async (url: string) => {
    const response = await makeRequest(url, { method: 'GET' });
    return response.json();
  };

  const post = async (url: string, data?: any) => {
    const response = await makeRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  };

  const put = async (url: string, data?: any) => {
    const response = await makeRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
    return response.json();
  };

  const del = async (url: string) => {
    const response = await makeRequest(url, { method: 'DELETE' });
    return response.json();
  };

  return {
    get,
    post,
    put,
    delete: del,
    makeRequest
  };
};