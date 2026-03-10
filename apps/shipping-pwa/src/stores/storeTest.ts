// Simple test to verify all stores are working
import {
  useAnalyticsStore,
  useMapStore,
  useNotificationStore,
  useShipmentStore,
  useUserStore,
} from './index'

// Test shipment store
export const testShipmentStore = () => {
  console.log('Testing Shipment Store...')

  const store = useShipmentStore.getState()

  // Test adding a door schedule
  store.addDoorSchedule({
    doorNumber: 350,
    destinationDC: '6024',
    freightType: '23/43',
    trailerStatus: 'partial',
    palletCount: 0,
    createdBy: 'test-user',
    tcrPresent: true,
  })

  const doorSchedules = useShipmentStore.getState().doorSchedules
  const scheduleId = doorSchedules[doorSchedules.length - 1]?.id ?? ''
  console.log('✅ Door schedule added:', scheduleId)

  // Test updating the schedule
  store.updateDoorSchedule(scheduleId, { palletCount: 15 })
  console.log('✅ Door schedule updated')

  // Test stats
  const stats = store.stats
  console.log('✅ Stats:', stats)

  return scheduleId
}

// Test notification store
export const testNotificationStore = () => {
  console.log('Testing Notification Store...')

  const store = useNotificationStore.getState()

  // Test adding notifications
  const infoId = store.showInfo('Test Info', 'This is a test info notification')
  const successId = store.showSuccess(
    'Test Success',
    'This is a test success notification'
  )
  const warningId = store.showWarning(
    'Test Warning',
    'This is a test warning notification'
  )
  const errorId = store.showError(
    'Test Error',
    'This is a test error notification'
  )

  console.log('✅ Notifications added:', {
    infoId,
    successId,
    warningId,
    errorId,
  })

  // Test unread count
  const unreadCount = store.unreadCount
  console.log('✅ Unread count:', unreadCount)

  // Test mark as read
  store.markAsRead(infoId)
  console.log('✅ Notification marked as read')

  return { infoId, successId, warningId, errorId }
}

// Test analytics store
export const testAnalyticsStore = () => {
  console.log('Testing Analytics Store...')

  const store = useAnalyticsStore.getState()

  // Test tracking events
  const clickId = store.trackClick('test-button', { page: 'test' })
  const navigationId = store.trackNavigation('/test', '/test2')
  const errorId = store.trackError(new Error('Test error'))

  console.log('✅ Events tracked:', { clickId, navigationId, errorId })

  // Test tracking metrics
  const loadTimeId = store.trackLoadTime('test-page', 1500)
  const responseTimeId = store.trackResponseTime('test-api', 200)

  console.log('✅ Metrics tracked:', { loadTimeId, responseTimeId })

  // Test session
  const sessionId = store.startSession('test-user', {
    type: 'desktop',
    os: 'Windows',
    browser: 'Chrome',
    screenSize: '1920x1080',
  })

  console.log('✅ Session started:', sessionId)

  return { clickId, navigationId, errorId, sessionId }
}

// Test user store
export const testUserStore = () => {
  console.log('Testing User Store...')

  const store = useUserStore.getState()

  // Test current user
  const currentUser = store.currentUser
  console.log('✅ Current user:', currentUser?.displayName)

  // Test updating settings
  store.updateSettings({
    interactionMode: 'swipe',
    voiceRecognitionEnabled: false,
  })
  console.log('✅ Settings updated')

  // Test permissions
  const canCreate = store.hasPermission('canCreateShipments')
  const canDelete = store.hasPermission('canDeleteShipments')
  console.log('✅ Permissions:', { canCreate, canDelete })

  return currentUser?.id
}

// Test map store
export const testMapStore = () => {
  console.log('Testing Map Store...')

  const store = useMapStore.getState()

  // Test adding a location
  const locationId = store.addLocation({
    name: 'Test Warehouse',
    type: 'warehouse',
    coordinates: {
      latitude: 39.7392,
      longitude: -104.9903,
    },
    address: '123 Test St, Test City, CO',
    description: 'Test warehouse location',
    isActive: true,
  })

  console.log('✅ Location added:', locationId)

  // Test adding tracking point
  const trackingId = store.addTrackingPoint({
    coordinates: {
      latitude: 39.74,
      longitude: -104.99,
    },
    status: 'in_transit',
    notes: 'Test tracking point',
  })

  console.log('✅ Tracking point added:', trackingId)

  // Test distance calculation
  const distance = store.calculateDistance(
    { latitude: 39.7392, longitude: -104.9903 },
    { latitude: 39.74, longitude: -104.99 }
  )

  console.log('✅ Distance calculated:', Math.round(distance), 'meters')

  return { locationId, trackingId }
}

// Run all tests
export const runAllStoreTests = () => {
  console.log('🧪 Running Store Tests...\n')

  try {
    const shipmentResults = testShipmentStore()
    console.log('')

    const notificationResults = testNotificationStore()
    console.log('')

    const analyticsResults = testAnalyticsStore()
    console.log('')

    const userResults = testUserStore()
    console.log('')

    const mapResults = testMapStore()
    console.log('')

    console.log('🎉 All store tests completed successfully!')

    return {
      shipment: shipmentResults,
      notification: notificationResults,
      analytics: analyticsResults,
      user: userResults,
      map: mapResults,
    }
  } catch (error) {
    console.error('❌ Store test failed:', error)
    throw error
  }
}

// Performance test
export const testStorePerformance = () => {
  console.log('⚡ Running Performance Tests...\n')

  const start = performance.now()

  // Test bulk operations
  const shipmentStore = useShipmentStore.getState()

  // Add 100 door schedules
  for (let i = 0; i < 100; i++) {
    shipmentStore.addDoorSchedule({
      doorNumber: 350 + i,
      destinationDC: '6024',
      freightType: '23/43',
      trailerStatus: 'partial',
      palletCount: Math.floor(Math.random() * 50),
      createdBy: 'performance-test',
      tcrPresent: true,
    })
  }

  const addTime = performance.now() - start
  console.log(`✅ Added 100 schedules in ${addTime.toFixed(2)}ms`)

  // Test bulk notifications
  const notificationStore = useNotificationStore.getState()
  const notificationStart = performance.now()

  for (let i = 0; i < 50; i++) {
    notificationStore.showInfo(`Test ${i}`, `Test notification ${i}`)
  }

  const notificationTime = performance.now() - notificationStart
  console.log(`✅ Added 50 notifications in ${notificationTime.toFixed(2)}ms`)

  // Test analytics bulk events
  const analyticsStore = useAnalyticsStore.getState()
  const analyticsStart = performance.now()

  for (let i = 0; i < 200; i++) {
    analyticsStore.trackEvent(`test_event_${i}`, 'custom', { index: i })
  }

  const analyticsTime = performance.now() - analyticsStart
  console.log(`✅ Tracked 200 events in ${analyticsTime.toFixed(2)}ms`)

  const totalTime = performance.now() - start
  console.log(`\n⚡ Total performance test time: ${totalTime.toFixed(2)}ms`)

  return {
    addSchedulesTime: addTime,
    notificationsTime: notificationTime,
    analyticsTime,
    totalTime,
  }
}
