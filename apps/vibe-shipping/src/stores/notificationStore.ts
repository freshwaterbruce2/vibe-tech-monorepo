import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

// Notification interface
export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  timestamp: string
  read: boolean
  dismissed: boolean
  autoHide: boolean
  hideAfter?: number // milliseconds
  actions?: NotificationAction[]
  metadata?: Record<string, any>
}

// Notification action interface
export interface NotificationAction {
  id: string
  label: string
  action: () => void
  variant?: 'primary' | 'secondary' | 'destructive'
}

// Notification settings
export interface NotificationSettings {
  enabled: boolean
  showToasts: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  autoHideDelay: number // milliseconds
  maxNotifications: number
  groupSimilar: boolean
  showPriority: NotificationPriority[]
  emailNotifications: boolean
  pushNotifications: boolean
}

// Notification state interface
interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  settings: NotificationSettings
  isVisible: boolean
  activeToasts: string[] // IDs of currently shown toasts
}

// Actions interface
interface NotificationActions {
  // Core notification actions
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>
  ) => string
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  dismissAll: () => void

  // Quick notification methods
  showInfo: (
    title: string,
    message: string,
    options?: Partial<Notification>
  ) => string
  showSuccess: (
    title: string,
    message: string,
    options?: Partial<Notification>
  ) => string
  showWarning: (
    title: string,
    message: string,
    options?: Partial<Notification>
  ) => string
  showError: (
    title: string,
    message: string,
    options?: Partial<Notification>
  ) => string

  // Toast management
  showToast: (id: string) => void
  hideToast: (id: string) => void
  hideAllToasts: () => void

  // Bulk operations
  clearOldNotifications: (olderThanDays: number) => void
  clearByType: (type: NotificationType) => void
  clearByPriority: (priority: NotificationPriority) => void

  // Settings
  updateSettings: (settings: Partial<NotificationSettings>) => void
  resetSettings: () => void

  // UI state
  setVisible: (visible: boolean) => void
  toggleVisible: () => void

  // Utility
  getNotificationsByType: (type: NotificationType) => Notification[]
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[]
  getUnreadNotifications: () => Notification[]
  getRecentNotifications: (hours: number) => Notification[]
}

// Combined store type
type NotificationStore = NotificationState & NotificationActions

// Default settings
const defaultSettings: NotificationSettings = {
  enabled: true,
  showToasts: true,
  soundEnabled: true,
  vibrationEnabled: true,
  autoHideDelay: 5000,
  maxNotifications: 100,
  groupSimilar: true,
  showPriority: ['medium', 'high', 'critical'],
  emailNotifications: false,
  pushNotifications: true,
}

// Generate unique ID
const generateId = (): string => {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create the notification store
export const useNotificationStore = create<NotificationStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        notifications: [],
        unreadCount: 0,
        settings: defaultSettings,
        isVisible: false,
        activeToasts: [],

        // Core notification actions
        addNotification: notificationData => {
          const id = generateId()
          const notification: Notification = {
            ...notificationData,
            id,
            timestamp: new Date().toISOString(),
            read: false,
            dismissed: false,
          }

          set(state => {
            const newNotifications = [notification, ...state.notifications]

            // Limit notifications to max count
            const limitedNotifications =
              newNotifications.length > state.settings.maxNotifications
                ? newNotifications.slice(0, state.settings.maxNotifications)
                : newNotifications

            // Update unread count
            const unreadCount = limitedNotifications.filter(
              n => !n.read && !n.dismissed
            ).length

            // Auto-show toast if enabled
            const activeToasts =
              state.settings.showToasts &&
              state.settings.showPriority.includes(notification.priority)
                ? [...state.activeToasts, id]
                : state.activeToasts

            return {
              ...state,
              notifications: limitedNotifications,
              unreadCount,
              activeToasts,
            }
          })

          // Auto-hide toast if configured
          if (notification.autoHide && notification.hideAfter) {
            setTimeout(() => {
              get().hideToast(id)
            }, notification.hideAfter)
          } else if (
            notification.autoHide &&
            get().settings.autoHideDelay > 0
          ) {
            setTimeout(() => {
              get().hideToast(id)
            }, get().settings.autoHideDelay)
          }

          return id
        },

        removeNotification: id => {
          set(state => {
            state.notifications = state.notifications.filter(n => n.id !== id)
            state.activeToasts = state.activeToasts.filter(t => t !== id)
            state.unreadCount = state.notifications.filter(
              n => !n.read && !n.dismissed
            ).length
          })
        },

        markAsRead: id => {
          set(state => {
            const notification = state.notifications.find(n => n.id === id)
            if (notification && !notification.read) {
              notification.read = true
              state.unreadCount = Math.max(0, state.unreadCount - 1)
            }
          })
        },

        markAllAsRead: () => {
          set(state => {
            state.notifications.forEach(notification => {
              notification.read = true
            })
            state.unreadCount = 0
          })
        },

        dismissNotification: id => {
          set(state => {
            const notification = state.notifications.find(n => n.id === id)
            if (notification) {
              notification.dismissed = true
              if (!notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1)
              }
            }
            state.activeToasts = state.activeToasts.filter(t => t !== id)
          })
        },

        dismissAll: () => {
          set(state => {
            state.notifications.forEach(notification => {
              notification.dismissed = true
            })
            state.unreadCount = 0
            state.activeToasts = []
          })
        },

        // Quick notification methods
        showInfo: (title, message, options = {}) => {
          return get().addNotification({
            type: 'info',
            priority: 'medium',
            title,
            message,
            autoHide: true,
            ...options,
          })
        },

        showSuccess: (title, message, options = {}) => {
          return get().addNotification({
            type: 'success',
            priority: 'medium',
            title,
            message,
            autoHide: true,
            ...options,
          })
        },

        showWarning: (title, message, options = {}) => {
          return get().addNotification({
            type: 'warning',
            priority: 'high',
            title,
            message,
            autoHide: false,
            ...options,
          })
        },

        showError: (title, message, options = {}) => {
          return get().addNotification({
            type: 'error',
            priority: 'critical',
            title,
            message,
            autoHide: false,
            ...options,
          })
        },

        // Toast management
        showToast: id => {
          set(state => {
            if (!state.activeToasts.includes(id)) {
              state.activeToasts.push(id)
            }
          })
        },

        hideToast: id => {
          set(state => {
            state.activeToasts = state.activeToasts.filter(t => t !== id)
          })
        },

        hideAllToasts: () => {
          set(state => {
            state.activeToasts = []
          })
        },

        // Bulk operations
        clearOldNotifications: olderThanDays => {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

          set(state => {
            state.notifications = state.notifications.filter(
              notification => new Date(notification.timestamp) > cutoffDate
            )
            state.unreadCount = state.notifications.filter(
              n => !n.read && !n.dismissed
            ).length
          })
        },

        clearByType: type => {
          set(state => {
            const removedNotifications = state.notifications.filter(
              n => n.type === type
            )
            state.notifications = state.notifications.filter(
              n => n.type !== type
            )

            // Update unread count
            const removedUnread = removedNotifications.filter(
              n => !n.read && !n.dismissed
            ).length
            state.unreadCount = Math.max(0, state.unreadCount - removedUnread)

            // Remove from active toasts
            const removedIds = removedNotifications.map(n => n.id)
            state.activeToasts = state.activeToasts.filter(
              id => !removedIds.includes(id)
            )
          })
        },

        clearByPriority: priority => {
          set(state => {
            const removedNotifications = state.notifications.filter(
              n => n.priority === priority
            )
            state.notifications = state.notifications.filter(
              n => n.priority !== priority
            )

            // Update unread count
            const removedUnread = removedNotifications.filter(
              n => !n.read && !n.dismissed
            ).length
            state.unreadCount = Math.max(0, state.unreadCount - removedUnread)

            // Remove from active toasts
            const removedIds = removedNotifications.map(n => n.id)
            state.activeToasts = state.activeToasts.filter(
              id => !removedIds.includes(id)
            )
          })
        },

        // Settings
        updateSettings: newSettings => {
          set(state => {
            state.settings = { ...state.settings, ...newSettings }
          })
        },

        resetSettings: () => {
          set(state => {
            state.settings = { ...defaultSettings }
          })
        },

        // UI state
        setVisible: visible => {
          set(state => {
            state.isVisible = visible
          })
        },

        toggleVisible: () => {
          set(state => {
            state.isVisible = !state.isVisible
          })
        },

        // Utility methods
        getNotificationsByType: type => {
          return get().notifications.filter(
            n => n.type === type && !n.dismissed
          )
        },

        getNotificationsByPriority: priority => {
          return get().notifications.filter(
            n => n.priority === priority && !n.dismissed
          )
        },

        getUnreadNotifications: () => {
          return get().notifications.filter(n => !n.read && !n.dismissed)
        },

        getRecentNotifications: hours => {
          const cutoffDate = new Date()
          cutoffDate.setHours(cutoffDate.getHours() - hours)

          return get().notifications.filter(
            notification =>
              new Date(notification.timestamp) > cutoffDate &&
              !notification.dismissed
          )
        },
      })),
      {
        name: 'notification-storage',
        partialize: state => ({
          notifications: state.notifications,
          settings: state.settings,
        }),
      }
    ),
    {
      name: 'notification-store',
    }
  )
)

// Selector hooks for better performance
export const useNotifications = () =>
  useNotificationStore(state => state.notifications.filter(n => !n.dismissed))
export const useUnreadCount = () =>
  useNotificationStore(state => state.unreadCount)
export const useNotificationSettings = () =>
  useNotificationStore(state => state.settings)
export const useActiveToasts = () =>
  useNotificationStore(
    state =>
      state.activeToasts
        .map(id => state.notifications.find(n => n.id === id))
        .filter(Boolean) as Notification[]
  )
export const useNotificationVisibility = () =>
  useNotificationStore(state => state.isVisible)
