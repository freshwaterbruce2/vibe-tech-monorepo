import { useCallback, useState } from 'react';

import type { NotificationType } from '../components/Notification';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string | undefined;
  duration?: number | undefined;
}

type AddNotification = (
  type: NotificationType,
  title: string,
  message?: string,
  duration?: number
) => string;

type ShowNotification = (title: string, message?: string) => string;

interface NotificationShortcuts {
  showSuccess: ShowNotification;
  showError: ShowNotification;
  showWarning: ShowNotification;
  showInfo: ShowNotification;
}

const useNotificationShortcuts = (addNotification: AddNotification): NotificationShortcuts => {
  const showSuccess = useCallback(
    (title: string, message?: string) => addNotification('success', title, message),
    [addNotification]
  );

  const showError = useCallback(
    // Errors stay longer
    (title: string, message?: string) => addNotification('error', title, message, 8000),
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => addNotification('warning', title, message),
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => addNotification('info', title, message),
    [addNotification]
  );

  return { showSuccess, showError, showWarning, showInfo };
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback<AddNotification>(
    (type: NotificationType, title: string, message?: string, duration = 5000) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const notification: NotificationItem = {
        id,
        type,
        title,
        message,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);
      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const { showSuccess, showError, showWarning, showInfo } =
    useNotificationShortcuts(addNotification);

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
