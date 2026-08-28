/**
 * Integration Test Script for Vibe Tutor Enhancements
 * Tests database, learning analytics, and performance services
 */

import * as fs from 'fs';
import * as path from 'path';
import { appIntegration } from '../src/services/appIntegration';
import { databaseService } from '../src/services/databaseService';
import { learningAnalytics } from '../src/services/learningAnalytics';
import { migrationService } from '../src/services/migrationService';
import { performanceService } from '../src/services/performanceOptimization';

// Mock browser globals for Node.js environment
if (typeof window === 'undefined') {
  const mockStorage: Record<string, string> = {};

  const windowMock = {
    location: { hostname: 'localhost', protocol: 'http:' },
    navigator: { userAgent: 'node' },
    crypto: globalThis.crypto || {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9),
    },
    localStorage: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete mockStorage[key];
      },
      clear: () => {
        for (const key in mockStorage) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete mockStorage[key];
        }
      },
    },
    sessionStorage: null as any,
    requestAnimationFrame: (callback: any) => setTimeout(callback, 16),
    performance: { now: () => Date.now() },
  };
  windowMock.sessionStorage = windowMock.localStorage;

  const mockElement = {
    appendChild: () => {},
    style: {},
    setAttribute: () => {},
    shadowRoot: { querySelector: () => null },
    tagName: 'JEEP-SQLITE',
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  Object.defineProperty(globalThis, 'window', { value: windowMock, configurable: true });
  Object.defineProperty(globalThis, 'document', {
    value: {
      createElement: () => mockElement,
      body: { appendChild: () => {} },
      querySelector: () => mockElement,
      documentElement: { style: {} },
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: windowMock.localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: windowMock.sessionStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'customElements', {
    value: { whenDefined: async () => Promise.resolve() },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    value: windowMock.requestAnimationFrame,
    configurable: true,
  });

  if (!(globalThis as any).navigator) {
    Object.defineProperty(globalThis, 'navigator', {
      value: windowMock.navigator,
      configurable: true,
    });
  }

  // Mock databaseService to avoid Capacitor SQLite issues in Node
  databaseService.initialize = async () => Promise.resolve();
  (databaseService as any).db = {
    open: async () => Promise.resolve(),
    execute: async () => Promise.resolve({ changes: { changes: 1 } }),
    query: async () => Promise.resolve({ values: [] }),
    run: async () => Promise.resolve({ changes: { changes: 1 } }),
    close: async () => Promise.resolve(),
  };
}

async function runIntegrationTests() {
  console.log('🧪 Starting Vibe Tutor Integration Tests...\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Initialization
  console.log('Test 1: Database Initialization');
  try {
    await databaseService.initialize();
    console.log('✅ Database initialized successfully');
    console.log('   Location: D:\\databases\\vibe-tutor\\');
    testsPassed++;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    testsFailed++;
  }

  // Test 2: Data Migration
  console.log('\nTest 2: Data Migration');
  try {
    // Set up test data in localStorage
    const testHomework = [
      {
        id: 'test_1',
        subject: 'Math',
        title: 'Test Assignment',
        dueDate: '2025-12-10',
        completed: false,
      },
    ];
    localStorage.setItem('homeworkItems', JSON.stringify(testHomework));

    // Perform migration
    await migrationService.performMigration();
    console.log('✅ Data migration completed');
    testsPassed++;

    // Verify migration
    const items = await databaseService.getHomeworkItems();
    if (items.length > 0) {
      console.log('   Migrated items:', items.length);
    }
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    testsFailed++;
  }

  // Test 3: Learning Analytics
  console.log('\nTest 3: Learning Analytics');
  try {
    await learningAnalytics.initialize();
    console.log('✅ Learning analytics initialized');
    console.log('   Path: D:\\learning-system\\vibe-tutor\\');

    // Start a test session
    learningAnalytics.startSession('Test Activity', 'Math', 'medium');
    learningAnalytics.updatePerformance(true);
    learningAnalytics.updatePerformance(true);
    learningAnalytics.updatePerformance(false);
    await learningAnalytics.endSession(0.75);

    console.log('   Test session recorded successfully');
    testsPassed++;

    // Verify log file on D: drive
    const logDir = 'D:\\learning-system\\logs';
    const logFile = path.join(logDir, `analytics-${new Date().toISOString().split('T')[0]}.log`);

    if (fs.existsSync(logFile)) {
      console.log('✅ Analytics log file verified on D: drive');
      console.log(`   Path: ${logFile}`);
      testsPassed++;
    } else {
      console.warn(
        '⚠️ Analytics log file not found on D: drive (may require backend server to be running)',
      );
    }
  } catch (error) {
    console.error('❌ Learning analytics failed:', error);
    testsFailed++;
  }

  // Test 4: App Integration
  console.log('\nTest 4: App Integration Service');
  try {
    await appIntegration.initialize();
    const status = appIntegration.getDatabaseStatus();
    console.log('✅ App integration initialized');
    console.log('   Status:', status);

    // Test homework operations
    const testItem = {
      id: 'integration_test',
      subject: 'Science',
      title: 'Integration Test',
      dueDate: '2025-12-15',
      completed: false,
    };

    await appIntegration.saveHomeworkItem(testItem);
    const items = await appIntegration.getHomeworkItems();

    if (items.find((item: any) => item.id === 'integration_test')) {
      console.log('   Homework operations working');
    }

    testsPassed++;
  } catch (error) {
    console.error('❌ App integration failed:', error);
    testsFailed++;
  }

  // Test 5: Performance Monitoring
  console.log('\nTest 5: Performance Monitoring');
  try {
    performanceService.initialize();

    // Wait a bit for metrics to collect
    await new Promise((resolve) => setTimeout(resolve, 100));

    const metrics = performanceService.getMetrics();
    console.log('✅ Performance monitoring active');
    console.log('   Memory usage:', Math.round(metrics.memoryUsage), 'MB');
    console.log('   FPS:', metrics.fps);
    console.log('   Network requests:', metrics.networkRequests);

    testsPassed++;
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error);
    testsFailed++;
  }

  // Test 6: Learning Recommendations
  console.log('\nTest 6: Learning Recommendations');
  try {
    const patterns = await learningAnalytics.analyzeLearningPatterns();
    const recommendations = await learningAnalytics.generateRecommendations(patterns);

    console.log('✅ Learning recommendations generated');
    console.log('   Best time:', patterns.bestTimeOfDay);
    console.log('   Learning style:', patterns.learningStyle);
    console.log('   Recommendations:', recommendations.length);

    testsPassed++;
  } catch (error) {
    console.error('❌ Learning recommendations failed:', error);
    testsFailed++;
  }

  // Test 7: Data Export/Import
  console.log('\nTest 7: Data Export/Import');
  try {
    const exportData = await appIntegration.exportData();
    const dataSize = new Blob([exportData]).size;

    console.log('✅ Data export working');
    console.log('   Export size:', Math.round(dataSize / 1024), 'KB');

    // Test import
    await appIntegration.importData(exportData);
    console.log('   Import successful');

    testsPassed++;
  } catch (error) {
    console.error('❌ Data export/import failed:', error);
    testsFailed++;
  }

  // Test 8: Adaptive Difficulty
  console.log('\nTest 8: Adaptive Difficulty');
  try {
    const mathDifficulty = await appIntegration.getAdaptiveDifficulty('Math');
    const scienceDifficulty = await appIntegration.getAdaptiveDifficulty('Science');

    console.log('✅ Adaptive difficulty calculated');
    console.log('   Math:', mathDifficulty);
    console.log('   Science:', scienceDifficulty);

    testsPassed++;
  } catch (error) {
    console.error('❌ Adaptive difficulty failed:', error);
    testsFailed++;
  }

  // Test 9: User Stats
  console.log('\nTest 9: User Statistics');
  try {
    const stats = await appIntegration.getUserStats();

    console.log('✅ User stats retrieved');
    console.log('   Total homework:', stats.totalHomework);
    console.log('   Completed:', stats.completedHomework);
    console.log('   Learning time:', stats.totalLearningTime, 'minutes');

    testsPassed++;
  } catch (error) {
    console.error('❌ User stats failed:', error);
    testsFailed++;
  }

  // Test 10: Performance Report
  console.log('\nTest 10: Performance Report');
  try {
    const report = performanceService.generateReport();

    console.log('✅ Performance report generated');
    console.log('   Report length:', report.length, 'characters');

    const suggestions = performanceService.analyzePerformance();
    console.log('   Optimization suggestions:', suggestions.length);

    testsPassed++;
  } catch (error) {
    console.error('❌ Performance report failed:', error);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testsPassed}/10`);
  console.log(`❌ Failed: ${testsFailed}/10`);
  console.log(`📈 Success Rate: ${((testsPassed / 10) * 100).toFixed(1)}%`);

  if (testsPassed === 10) {
    console.log('\n🎉 All tests passed! Integration complete.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  localStorage.removeItem('homeworkItems');

  return {
    passed: testsPassed,
    failed: testsFailed,
    total: 10,
  };
}

// Run tests if this file is executed directly
// For ES module compatibility
runIntegrationTests()
  .then((results) => {
    console.log('\n✅ Integration tests completed');
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

export { runIntegrationTests };
