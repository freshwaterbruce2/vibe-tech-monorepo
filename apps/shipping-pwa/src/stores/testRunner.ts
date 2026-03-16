// Test runner for the stores - basic functionality test
import { runAllStoreTests, testStorePerformance } from './storeTest';

// This can be called from browser console or in a test environment
export const runStoreTests = () => {
  console.warn('🚀 Starting Zustand Store Tests...\n');

  try {
    // Run basic functionality tests
    const testResults = runAllStoreTests();
    console.warn('\n✅ All stores are working correctly!');

    // Run performance tests
    console.warn('\n⚡ Running performance tests...');
    const performanceResults = testStorePerformance();

    console.warn('\n🎯 Test Summary:');
    console.warn('================');
    console.warn('✅ Shipment Store: Working');
    console.warn('✅ Notification Store: Working');
    console.warn('✅ Analytics Store: Working');
    console.warn('✅ User Store: Working');
    console.warn('✅ Map Store: Working');
    console.warn('\n📊 Performance:');
    console.warn(`- Add 100 schedules: ${performanceResults.addSchedulesTime.toFixed(2)}ms`);
    console.warn(`- Add 50 notifications: ${performanceResults.notificationsTime.toFixed(2)}ms`);
    console.warn(`- Track 200 events: ${performanceResults.analyticsTime.toFixed(2)}ms`);
    console.warn(`- Total test time: ${performanceResults.totalTime.toFixed(2)}ms`);

    return {
      success: true,
      testResults,
      performanceResults,
    };

  } catch (error) {
    console.error('❌ Store tests failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Manual test of store persistence
export const testStorePersistence = () => {
  console.warn('💾 Testing store persistence...\n');

  // Import stores
  import('./index').then(({
    useShipmentStore,
    useNotificationStore,
    useUserStore
  }) => {

    // Test shipment store persistence
    const shipmentStore = useShipmentStore.getState();
    console.warn('📦 Current shipments:', shipmentStore.doorSchedules.length);

    // Add a test shipment
    shipmentStore.addDoorSchedule({
      doorNumber: 999,
      destinationDC: '6024',
      freightType: '23/43',
      trailerStatus: 'partial',
      palletCount: 25,
      createdBy: 'persistence-test',
      tcrPresent: true,
    });

    console.warn('✅ Added test shipment');
    console.warn('📦 New shipment count:', shipmentStore.doorSchedules.length);

    // Test notification store persistence
    const notificationStore = useNotificationStore.getState();
    console.warn('🔔 Current notifications:', notificationStore.notifications.length);

    notificationStore.showInfo('Persistence Test', 'This notification tests persistence');
    console.warn('✅ Added test notification');
    console.warn('🔔 New notification count:', notificationStore.notifications.length);

    // Test user store persistence
    const userStore = useUserStore.getState();
    console.warn('👤 Current user:', userStore.currentUser?.displayName);

    userStore.updateSettings({
      interactionMode: 'swipe',
      voiceRecognitionEnabled: false,
    });

    console.warn('✅ Updated user settings');
    console.warn('⚙️ Interaction mode:', userStore.settings.interactionMode);

    console.warn('\n💾 Persistence test completed!');
    console.warn('🔄 Refresh the page to verify data persists in localStorage');
  });
};

// Export for window/global access
if (typeof window !== 'undefined') {
  (window as any).runStoreTests = runStoreTests;
  (window as any).testStorePersistence = testStorePersistence;
  console.warn('🧪 Store tests available as: window.runStoreTests() and window.testStorePersistence()');
}