import { useCallback, useState } from 'react';

import type { NotificationType } from '../components/Notification';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string | undefined;
  duration?: number | undefined;
}

function buildNotification(
  type: NotificationType,
  title: string,
  message?: string,
  duration = 5000
): NotificationItem {
  return { id: `notification-${crypto.randomUUID()}`, type, title, message, duration };
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback(
    (type: NotificationType, title: string, message?: string, duration = 5000) => {
      const notification = buildNotification(type, title, message, duration);
      setNotifications(prev => [...prev, notification]);
      return notification.id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      return addNotification('success', title, message);
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      return addNotification('error', title, message, 8000); // Errors stay longer
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      return addNotification('warning', title, message);
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      return addNotification('info', title, message);
    },
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

export default useNotifications;
