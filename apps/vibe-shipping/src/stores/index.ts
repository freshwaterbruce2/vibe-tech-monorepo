// Local imports for store utilities below
import { useAnalyticsStore } from './analyticsStore'
import { useMapStore } from './mapStore'
import { useNotificationStore } from './notificationStore'
import { useShipmentStore } from './shipmentStore'

// Export all Zustand stores and their related types/hooks

// Shipment Store
export {
  useActivePalletEntry,
  useDoorSchedules,
  usePalletEntries,
  useSelectedDoorSchedule,
  useShipmentError,
  useShipmentLoading,
  useShipmentStats,
  useShipmentStore,
} from './shipmentStore'

// Notification Store
export {
  useActiveToasts,
  useNotifications,
  useNotificationSettings,
  useNotificationStore,
  useNotificationVisibility,
  useUnreadCount,
  type Notification,
  type NotificationAction,
  type NotificationPriority,
  type NotificationSettings,
  type NotificationType,
} from './notificationStore'

// Analytics Store
export {
  useAnalyticsConfig,
  useAnalyticsEvents,
  useAnalyticsInsights,
  useAnalyticsMetrics,
  useAnalyticsStore,
  useAnalyticsTracking,
  useCurrentSession,
  type AnalyticsConfig,
  type AnalyticsEvent,
  type AnalyticsInsights,
  type PerformanceMetrics,
  type UserSession,
} from './analyticsStore'

// User Store
export {
  useAllUsers,
  useAuthError,
  useAuthLoading,
  useCurrentUser,
  useIsAuthenticated,
  useSelectedUser,
  useUserPermissions,
  useUserPreferences,
  useUserSettings,
  useUserStore,
  type User,
  type UserPermissions,
  type UserPreferences,
} from './userStore'

// Map Store
export {
  useActiveRoute,
  useCurrentLocation,
  useGeofences,
  useLocationEnabled,
  useLocationError,
  useLocations,
  useMapSettings,
  useMapStore,
  useMapView,
  useSelectedLocation,
  useTrackingPoints,
  type Coordinates,
  type DeliveryRoute,
  type Geofence,
  type GeofenceEvent,
  type MapLocation,
  type TrackingPoint,
} from './mapStore'

// Store initialization utility
export const initializeStores = () => {
  // This function can be called during app initialization
  // to set up any store listeners, middleware, or initial data

  // Example: Auto-generate insights periodically
  const analyticsStore = useAnalyticsStore.getState()
  if (analyticsStore.config.enableRealTimeInsights) {
    setInterval(
      () => {
        analyticsStore.generateInsights()
      },
      analyticsStore.config.reportingInterval * 60 * 1000
    )
  }

  // Example: Auto-cleanup old data
  setInterval(
    () => {
      const notificationStore = useNotificationStore.getState()
      notificationStore.clearOldNotifications(30) // 30 days

      const mapStore = useMapStore.getState()
      mapStore.clearTrackingHistory(24) // 24 hours

      analyticsStore.clearOldData(90) // 90 days
    },
    24 * 60 * 60 * 1000
  ) // Daily cleanup
}

// Store reset utility for testing or data migration
export const resetAllStores = () => {
  useShipmentStore.getState().clearAllData()
  useNotificationStore.getState().dismissAll()
  useAnalyticsStore.getState().clearOldData(0)
  useMapStore.getState().clearAllData()
  // Note: User store is not reset to preserve authentication
}

// Store hydration utility for SSR or offline scenarios
export const hydrateStores = async () => {
  // This can be used to manually rehydrate stores if needed
  // All stores have persist middleware, so this is mainly for special cases

  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Stores will auto-hydrate from localStorage
      console.warn('Stores hydrated from localStorage')
    }
  } catch (error) {
    console.warn('Failed to hydrate stores:', error)
  }
}

// Export store types for TypeScript
export type {
  DestinationDC,
  // Shipment types
  DoorSchedule,
  FreightType,
  InteractionMode,
  PalletEntry,
  TrailerStatus,
  UserSettings,
  VoiceActivationMode,
  VoiceEngine,
} from '@/types/shipping'
