import { useNotificationContext } from '../contexts/NotificationContext';
import type { NotificationConfig } from '../types';

/**
 * Custom hook for easy notification management
 * Re-exports the notification context for convenient access
 *
 * @example
 * ```tsx
 * const { error, success, warning, info } = useNotifications();
 *
 * // Show an error notification
 * error('Error', 'Something went wrong');
 *
 * // Show a success notification with custom duration
 * success('Success', 'Operation completed', 3000);
 *
 * // Show notification that doesn't auto-dismiss
 * error('Critical Error', 'Please check logs', 0);
 * ```
 */
export const useNotifications = () => {
  const context = useNotificationContext();

  return {
    /**
     * Display an error notification
     * @param title Notification title
     * @param message Notification message
     * @param duration Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss)
     * @returns Notification ID
     */
    error: (title: string, message: string, duration?: number): string => {
      return context.error(title, message, duration);
    },

    /**
     * Display a warning notification
     * @param title Notification title
     * @param message Notification message
     * @param duration Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss)
     * @returns Notification ID
     */
    warning: (title: string, message: string, duration?: number): string => {
      return context.warning(title, message, duration);
    },

    /**
     * Display a success notification
     * @param title Notification title
     * @param message Notification message
     * @param duration Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss)
     * @returns Notification ID
     */
    success: (title: string, message: string, duration?: number): string => {
      return context.success(title, message, duration);
    },

    /**
     * Display an info notification
     * @param title Notification title
     * @param message Notification message
     * @param duration Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss)
     * @returns Notification ID
     */
    info: (title: string, message: string, duration?: number): string => {
      return context.info(title, message, duration);
    },

    /**
     * Add a custom notification with full configuration
     * @param config Notification configuration
     * @returns Notification ID
     */
    addNotification: (config: NotificationConfig): string => {
      return context.addNotification(config);
    },

    /**
     * Remove a specific notification by ID
     * @param id Notification ID
     */
    removeNotification: (id: string): void => {
      context.removeNotification(id);
    },

    /**
     * Clear all notifications
     */
    clearAll: (): void => {
      context.clearAll();
    },

    /**
     * Get all current notifications
     */
    notifications: context.notifications,
  };
};
