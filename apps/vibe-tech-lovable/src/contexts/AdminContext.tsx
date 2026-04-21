import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  checkAdminStatus: () => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_PASSWORD = "vibe2024admin"; // In production, this would be handled more securely

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    // Check if admin session exists in localStorage
    const adminSession = window.electronAPI.store.get('vibetech_admin_session');
    return adminSession === 'authenticated';
  });

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      window.electronAPI.store.set('vibetech_admin_session', 'authenticated');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    window.electronAPI.store.delete('vibetech_admin_session');
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