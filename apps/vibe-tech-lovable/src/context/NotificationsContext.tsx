
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);
const NOTIFICATIONS_STORAGE_KEY = "notifications";

type ElectronStoreShape = {
  get: (key: string) => string | null | undefined;
  set: (key: string, value: string) => void;
};

type ElectronApiShape = {
  store?: ElectronStoreShape;
};

const getElectronStore = (): ElectronStoreShape | null => {
  const api = (window as Window & { electronAPI?: ElectronApiShape }).electronAPI;
  return api?.store ?? null;
};

const readStoredNotifications = (): string | null => {
  const electronStore = getElectronStore();
  if (electronStore) {
    return electronStore.get(NOTIFICATIONS_STORAGE_KEY) ?? null;
  }
  return window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
};

const writeStoredNotifications = (value: string): void => {
  const electronStore = getElectronStore();
  if (electronStore) {
    electronStore.set(NOTIFICATIONS_STORAGE_KEY, value);
    return;
  }
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, value);
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
};

const loadNotificationsFromStorage = (): Notification[] => {
  try {
    const storedNotifications = readStoredNotifications();
    if (storedNotifications) {
      const parsedNotifications = JSON.parse(storedNotifications);

      // Convert string dates back to Date objects
      return parsedNotifications.map((notification: Record<string, unknown>) => ({
        ...notification,
        timestamp: new Date(notification.timestamp as string)
      }));
    }
  } catch (error) {
    console.error("Failed to parse notifications from localStorage:", error);
  }
  return [];
};

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotificationsFromStorage);

  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Update localStorage whenever notifications change
  useEffect(() => {
    writeStoredNotifications(JSON.stringify(notifications));
  }, [notifications]);

  // Add a new notification
  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show a toast for the new notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === "error" ? "destructive" : "default",
    });
  };

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
