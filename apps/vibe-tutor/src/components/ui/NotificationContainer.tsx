import React from 'react';
import { useNotificationContext } from '../../contexts/NotificationContext';
import ErrorToast from './ErrorToast';

/**
 * Container component that displays all active notifications
 * Positioned at top-right of the screen with stacking support
 */
const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotificationContext();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {notifications.map((notification, index) => (
        <div key={notification.id} className="pointer-events-auto">
          <ErrorToast
            notification={notification}
            onClose={removeNotification}
            index={index}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
