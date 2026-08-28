import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  checkAdminStatus: () => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSWORD = "vibe2024admin"; // In production, this would be handled more securely
const ADMIN_SESSION_KEY = 'vibetech_admin_session';

const getStoredAdminSession = (): string | null => {
  const electronStore = window.electronAPI?.store;
  if (electronStore) {
    return electronStore.get(ADMIN_SESSION_KEY);
  }

  return window.localStorage.getItem(ADMIN_SESSION_KEY);
};

const setStoredAdminSession = () => {
  const electronStore = window.electronAPI?.store;
  if (electronStore) {
    electronStore.set(ADMIN_SESSION_KEY, 'authenticated');
    return;
  }

  window.localStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
};

const clearStoredAdminSession = () => {
  const electronStore = window.electronAPI?.store;
  if (electronStore) {
    electronStore.delete(ADMIN_SESSION_KEY);
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const adminSession = getStoredAdminSession();
    return adminSession === 'authenticated';
  });

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setStoredAdminSession();
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    clearStoredAdminSession();
  };

  const checkAdminStatus = (): boolean => {
    return isAdmin;
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout, checkAdminStatus }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
