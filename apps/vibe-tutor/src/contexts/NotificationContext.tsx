import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Notification, NotificationConfig } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (config: NotificationConfig) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  error: (title: string, message: string, duration?: number) => string;
  warning: (title: string, message: string, duration?: number) => string;
  success: (title: string, message: string, duration?: number) => string;
  info: (title: string, message: string, duration?: number) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const generateId = (): string => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider = ({
  children,
  maxNotifications = 5,
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (config: NotificationConfig): string => {
      const id = generateId();
      const notification: Notification = {
        id,
        type: config.type,
        title: config.title,
        message: config.message,
        duration: config.duration ?? 5000, // Default 5 seconds
        timestamp: Date.now(),
      };

      setNotifications((prev) => {
        // Add new notification and limit to max
        const updated = [notification, ...prev].slice(0, maxNotifications);
        return updated;
      });

      // Auto-dismiss if duration is set and not 0
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, notification.duration);
      }

      return id;
    },
    [maxNotifications, removeNotification]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const error = useCallback(
    (title: string, message: string, duration?: number): string => {
      return addNotification({ type: 'error', title, message, duration });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message: string, duration?: number): string => {
      return addNotification({ type: 'warning', title, message, duration });
    },
    [addNotification]
  );

  const success = useCallback(
    (title: string, message: string, duration?: number): string => {
      return addNotification({ type: 'success', title, message, duration });
    },
    [addNotification]
  );

  const info = useCallback(
    (title: string, message: string, duration?: number): string => {
      return addNotification({ type: 'info', title, message, duration });
    },
    [addNotification]
  );

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    error,
    warning,
    success,
    info,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
