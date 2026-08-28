# Zustand State Management Implementation

This directory contains a complete Zustand-based state management solution for the shipping PWA application. The implementation follows 2025 best practices for TypeScript, performance optimization, and maintainable architecture.

## 🏗️ Architecture Overview

The state management is organized into five specialized stores:

- **📦 ShipmentStore** - Door schedules, pallet entries, and shipping operations
- **🔔 NotificationStore** - Alerts, toasts, and user notifications
- **📊 AnalyticsStore** - Event tracking, metrics, and performance monitoring
- **👤 UserStore** - Authentication, settings, and user preferences
- **🗺️ MapStore** - Location tracking, geofencing, and delivery routes

## 📁 File Structure

```
src/stores/
├── index.ts                    # Central exports and store utilities
├── shipmentStore.ts           # Shipment and pallet management
├── notificationStore.ts       # Notification system
├── analyticsStore.ts          # Analytics and tracking
├── userStore.ts               # User authentication and settings
├── mapStore.ts                # Location and mapping features
├── storeTest.ts               # Comprehensive testing suite
├── testRunner.ts              # Test execution utilities
└── README.md                  # This documentation
```

## 🚀 Getting Started

### Basic Usage

```typescript
import {
  useShipmentStore,
  useNotificationStore,
  useUserStore,
  useAnalyticsStore,
  useMapStore
} from '@/stores';

// In a React component
function ShippingDashboard() {
  const { doorSchedules, addDoorSchedule } = useShipmentStore();
  const { showSuccess } = useNotificationStore();
  const { currentUser } = useUserStore();

  const handleAddSchedule = (data) => {
    addDoorSchedule(data);
    showSuccess('Schedule Added', 'Door schedule created successfully');
  };

  return (
    <div>
      <h1>Welcome, {currentUser?.displayName}</h1>
      <p>Total Schedules: {doorSchedules.length}</p>
    </div>
  );
}
```

### Selector Hooks (Optimized Performance)

```typescript
import {
  useShipmentStats,
  useDoorSchedules,
  useNotifications,
  useCurrentUser
} from '@/stores';

// These hooks automatically re-render only when specific data changes
function OptimizedComponent() {
  const stats = useShipmentStats();          // Only re-renders when stats change
  const schedules = useDoorSchedules();      // Only re-renders when schedules change
  const notifications = useNotifications(); // Only re-renders when notifications change
  const user = useCurrentUser();            // Only re-renders when user changes

  return (
    <div>
      <div>Total Shipments: {stats.totalShipments}</div>
      <div>Unread Notifications: {notifications.filter(n => !n.read).length}</div>
    </div>
  );
}
```

## 📦 Store Details

### ShipmentStore

Manages all shipping-related data including door schedules and pallet entries.

**Key Features:**

- ✅ Door schedule CRUD operations
- ✅ Pallet entry management with counting
- ✅ Real-time statistics calculation
- ✅ Data import/export functionality
- ✅ Loading and error state management

**Example Usage:**

```typescript
const shipmentStore = useShipmentStore();

// Add a new door schedule
shipmentStore.addDoorSchedule({
  doorNumber: 350,
  destinationDC: '6024',
  freightType: '23/43',
  trailerStatus: 'partial',
  palletCount: 0,
  createdBy: 'user123',
  tcrPresent: true,
});

// Update pallet count
shipmentStore.updateDoorSchedule(scheduleId, { palletCount: 25 });

// Get statistics
const stats = shipmentStore.stats;
console.log(stats.totalShipments, stats.averagePalletsPerDoor);
```

### NotificationStore

Advanced notification system with toast management and user preferences.

**Key Features:**

- ✅ Multiple notification types (info, success, warning, error)
- ✅ Priority-based notifications
- ✅ Auto-hide and manual dismissal
- ✅ Toast management with active tracking
- ✅ Bulk operations and filtering
- ✅ Configurable settings

**Example Usage:**

```typescript
const notificationStore = useNotificationStore();

// Quick notification methods
const id = notificationStore.showSuccess('Success!', 'Operation completed');
notificationStore.showError('Error!', 'Something went wrong');

// Advanced notifications with actions
notificationStore.addNotification({
  type: 'warning',
  priority: 'high',
  title: 'Confirmation Required',
  message: 'Please confirm this action',
  autoHide: false,
  actions: [
    {
      id: 'confirm',
      label: 'Confirm',
      action: () => console.log('Confirmed'),
      variant: 'primary'
    },
    {
      id: 'cancel',
      label: 'Cancel',
      action: () => console.log('Cancelled'),
      variant: 'secondary'
    }
  ]
});
```

### AnalyticsStore

Comprehensive tracking and analytics system for user behavior and performance monitoring.

**Key Features:**

- ✅ Event tracking (clicks, navigation, forms, errors)
- ✅ Performance metrics (load times, response times)
- ✅ User session management
- ✅ Business metrics tracking
- ✅ Automated insights generation
- ✅ Data export capabilities

**Example Usage:**

```typescript
const analyticsStore = useAnalyticsStore();

// Track user actions
analyticsStore.trackClick('export-button', { page: 'dashboard' });
analyticsStore.trackNavigation('/dashboard', '/shipments');
analyticsStore.trackFormSubmit('door-schedule-form', true);

// Track performance
analyticsStore.trackLoadTime('dashboard', 1500);
analyticsStore.trackResponseTime('api-call', 200);

// Track business events
analyticsStore.trackShipmentCreated('ship123', 350, '6024');
analyticsStore.trackVoiceCommand('add door 350', true, 0.85);

// Generate insights
await analyticsStore.generateInsights();
```

### UserStore

Enhanced user management with authentication, preferences, and permissions.

**Key Features:**

- ✅ User authentication and session management
- ✅ Comprehensive user preferences
- ✅ Role-based permissions system
- ✅ Legacy settings support
- ✅ Multi-user management (admin features)
- ✅ Accessibility settings

**Example Usage:**

```typescript
const userStore = useUserStore();

// Authentication
await userStore.login('username', 'password');
userStore.logout();

// Update preferences
userStore.updateUserPreferences({
  theme: 'dark',
  notifications: { sound: false },
  accessibility: { largeText: true }
});

// Check permissions
if (userStore.hasPermission('canCreateShipments')) {
  // User can create shipments
}

// Feature access control
if (userStore.canAccessFeature('admin-panel')) {
  // Show admin features
}
```

### MapStore

Advanced mapping and location tracking functionality.

**Key Features:**

- ✅ Real-time location tracking
- ✅ Facility and location management
- ✅ Geofencing with event triggers
- ✅ Delivery route planning
- ✅ Distance and bearing calculations
- ✅ Offline map support

**Example Usage:**

```typescript
const mapStore = useMapStore();

// Location tracking
const location = await mapStore.requestLocation();
mapStore.startLocationTracking();

// Add facilities
const warehouseId = mapStore.addLocation({
  name: 'Main Warehouse',
  type: 'warehouse',
  coordinates: { latitude: 39.7392, longitude: -104.9903 },
  address: '123 Warehouse St',
  isActive: true
});

// Create geofence
const geofenceId = mapStore.addGeofence({
  name: 'Warehouse Zone',
  type: 'circle',
  center: { latitude: 39.7392, longitude: -104.9903 },
  radius: 500, // meters
  isActive: true,
  triggers: [
    {
      id: 'entry',
      type: 'enter',
      action: 'notify',
      message: 'Entered warehouse zone'
    }
  ]
});

// Calculate distance
const distance = mapStore.calculateDistance(pointA, pointB);
```

## 🔧 Configuration

### Persistence Settings

All stores use Zustand's persist middleware with localStorage:

```typescript
persist(
  (set, get) => ({ /* store logic */ }),
  {
    name: 'store-name-storage',
    partialize: (state) => ({
      // Only persist essential data
      key1: state.key1,
      key2: state.key2,
    }),
  }
)
```

### DevTools Integration

All stores include Redux DevTools integration for debugging:

```typescript
devtools(
  persist(/* ... */),
  { name: 'store-name' }
)
```

## 🧪 Testing

### Running Tests

The stores include comprehensive testing utilities:

```typescript
// In browser console or test environment
import { runStoreTests, testStorePersistence } from '@/stores/testRunner';

// Run all functionality tests
runStoreTests();

// Test persistence
testStorePersistence();
```

### Test Coverage

- ✅ Basic CRUD operations
- ✅ State persistence
- ✅ Performance benchmarks
- ✅ Error handling
- ✅ Selector hook optimization
- ✅ Cross-store interactions

## 🚀 Performance Optimizations

### 1. Selector Hooks

Use specific selector hooks instead of the full store:

```typescript
// ❌ Bad - subscribes to entire store
const fullStore = useShipmentStore();

// ✅ Good - subscribes only to stats
const stats = useShipmentStats();
```

### 2. Immutable Updates

All state updates use immutable patterns:

```typescript
// Proper immutable update
set(state => ({
  ...state,
  items: [...state.items, newItem],
  meta: { ...state.meta, count: state.meta.count + 1 }
}));
```

### 3. Computed Values

Use derived state instead of storing computed values:

```typescript
// Access computed values via getters
const completionRate = useMemo(() => {
  return stats.completedShipments / stats.totalShipments;
}, [stats.completedShipments, stats.totalShipments]);
```

## 🔄 Migration from Context API

If migrating from existing Context API usage:

```typescript
// Before: Context API
const { currentUser, updateUser } = useContext(UserContext);

// After: Zustand
const { currentUser, updateCurrentUser } = useUserStore();
```

## 📊 Store Initialization

Initialize stores during app startup:

```typescript
// In main.tsx or App.tsx
import { initializeStores } from '@/stores';

// Initialize all stores with background tasks
initializeStores();
```

## 🛠️ Best Practices

1. **Use Selector Hooks**: Always prefer specific selector hooks over full store access
2. **Immutable Updates**: Never mutate state directly; always return new objects
3. **Async Operations**: Handle async operations in actions, not in components
4. **Error Boundaries**: Wrap store-dependent components in error boundaries
5. **Testing**: Test store logic independently from components
6. **Performance**: Use `useMemo` and `useCallback` for expensive computations

## 🔧 Troubleshooting

### Common Issues

1. **Store Not Persisting**: Check localStorage permissions and quotas
2. **Performance Issues**: Verify using selector hooks instead of full store
3. **TypeScript Errors**: Ensure all store types are properly exported
4. **State Not Updating**: Check for direct mutations vs immutable updates

### Debug Commands

```typescript
// Check store state
console.log(useShipmentStore.getState());

// Clear all persistence
localStorage.clear();

// Reset specific store
useShipmentStore.getState().clearAllData();
```

## 📈 Future Enhancements

Planned improvements for the store system:

- [ ] **Offline Sync**: Queue operations when offline and sync when online
- [ ] **Real-time Updates**: WebSocket integration for live data updates
- [ ] **Advanced Analytics**: Machine learning insights and predictions
- [ ] **Data Validation**: Runtime validation with Zod schemas
- [ ] **Store Composition**: Combine stores for complex workflows
- [ ] **Performance Monitoring**: Built-in performance tracking and alerts

## 🤝 Contributing

When adding new features to the stores:

1. Follow the existing patterns and TypeScript interfaces
2. Add comprehensive tests for new functionality
3. Update this documentation with new features
4. Use immutable update patterns
5. Include proper error handling
6. Add selector hooks for new state slices

This Zustand implementation provides a robust, scalable, and performant state management solution for the shipping PWA, following 2025 best practices and optimized for production use.
