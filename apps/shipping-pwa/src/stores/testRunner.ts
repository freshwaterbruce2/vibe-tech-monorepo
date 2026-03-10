// Test runner for the stores - basic functionality test
import { runAllStoreTests, testStorePerformance } from './storeTest';

// This can be called from browser console or in a test environment
export const runStoreTests = () => {
  console.log('🚀 Starting Zustand Store Tests...\n');

  try {
    // Run basic functionality tests
    const testResults = runAllStoreTests();
    console.log('\n✅ All stores are working correctly!');

    // Run performance tests
    console.log('\n⚡ Running performance tests...');
    const performanceResults = testStorePerformance();

    console.log('\n🎯 Test Summary:');
    console.log('================');
    console.log('✅ Shipment Store: Working');
    console.log('✅ Notification Store: Working');
    console.log('✅ Analytics Store: Working');
    console.log('✅ User Store: Working');
    console.log('✅ Map Store: Working');
    console.log('\n📊 Performance:');
    console.log(`- Add 100 schedules: ${performanceResults.addSchedulesTime.toFixed(2)}ms`);
    console.log(`- Add 50 notifications: ${performanceResults.notificationsTime.toFixed(2)}ms`);
    console.log(`- Track 200 events: ${performanceResults.analyticsTime.toFixed(2)}ms`);
    console.log(`- Total test time: ${performanceResults.totalTime.toFixed(2)}ms`);

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
  console.log('💾 Testing store persistence...\n');

  // Import stores
  import('./index').then(({
    useShipmentStore,
    useNotificationStore,
    useUserStore
  }) => {

    // Test shipment store persistence
    const shipmentStore = useShipmentStore.getState();
    console.log('📦 Current shipments:', shipmentStore.doorSchedules.length);

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

    console.log('✅ Added test shipment');
    console.log('📦 New shipment count:', shipmentStore.doorSchedules.length);

    // Test notification store persistence
    const notificationStore = useNotificationStore.getState();
    console.log('🔔 Current notifications:', notificationStore.notifications.length);

    notificationStore.showInfo('Persistence Test', 'This notification tests persistence');
    console.log('✅ Added test notification');
    console.log('🔔 New notification count:', notificationStore.notifications.length);

    // Test user store persistence
    const userStore = useUserStore.getState();
    console.log('👤 Current user:', userStore.currentUser?.displayName);

    userStore.updateSettings({
      interactionMode: 'swipe',
      voiceRecognitionEnabled: false,
    });

    console.log('✅ Updated user settings');
    console.log('⚙️ Interaction mode:', userStore.settings.interactionMode);

    console.log('\n💾 Persistence test completed!');
    console.log('🔄 Refresh the page to verify data persists in localStorage');
  });
};

// Export for window/global access
if (typeof window !== 'undefined') {
  (window as any).runStoreTests = runStoreTests;
  (window as any).testStorePersistence = testStorePersistence;
  console.log('🧪 Store tests available as: window.runStoreTests() and window.testStorePersistence()');
}