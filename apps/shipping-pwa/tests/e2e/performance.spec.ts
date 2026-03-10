import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate to the page and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results = {
          fcp: 0,
          lcp: 0,
          cls: 0,
          fid: 0,
          ttfb: 0
        };

        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            results.fcp = fcpEntry.startTime;
          }
        }).observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcpEntry = entries[entries.length - 1];
          if (lcpEntry) {
            results.lcp = lcpEntry.startTime;
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let clsValue = 0;
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          results.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Time to First Byte
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          results.ttfb = navigation.responseStart - navigation.requestStart;
        }

        // Resolve after a short delay to collect metrics
        setTimeout(() => resolve(results), 2000);
      });
    });

    // Core Web Vitals thresholds
    expect(metrics.fcp).toBeLessThan(1800); // Good: < 1.8s
    expect(metrics.lcp).toBeLessThan(2500); // Good: < 2.5s
    expect(metrics.cls).toBeLessThan(0.1);  // Good: < 0.1
    expect(metrics.ttfb).toBeLessThan(600); // Good: < 600ms

    console.log('Performance Metrics:', metrics);
  });

  test('should load critical resources efficiently', async ({ page }) => {
    await page.goto('/');

    const resourceTiming = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const criticalResources = resources.filter((resource: any) =>
        resource.name.includes('.js') ||
        resource.name.includes('.css') ||
        resource.name.includes('manifest.json')
      );

      return criticalResources.map((resource: any) => ({
        name: resource.name,
        duration: resource.duration,
        transferSize: resource.transferSize,
        type: resource.initiatorType
      }));
    });

    // Check that critical resources load quickly
    const jsResources = resourceTiming.filter(r => r.name.includes('.js'));
    const cssResources = resourceTiming.filter(r => r.name.includes('.css'));

    jsResources.forEach(resource => {
      expect(resource.duration).toBeLessThan(1000); // < 1s load time
    });

    cssResources.forEach(resource => {
      expect(resource.duration).toBeLessThan(500); // < 500ms load time
    });

    console.log('Resource timing:', resourceTiming);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/');

    // Create a large dataset
    const startTime = Date.now();

    await page.evaluate(() => {
      // Simulate adding 100 door entries
      const doorEntries = [];
      for (let i = 332; i < 432; i++) {
        doorEntries.push({
          doorNumber: i,
          destination: '6024',
          freightType: '23/43',
          trailerStatus: 'partial',
          timestamp: Date.now()
        });
      }
      localStorage.setItem('doorEntries', JSON.stringify(doorEntries));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should render large dataset in under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check that all entries are rendered efficiently
    const entryCount = await page.locator('[data-testid^="door-entry-"]').count();
    expect(entryCount).toBe(100);
  });

  test('should maintain performance during interactions', async ({ page }) => {
    await page.goto('/');

    // Measure interaction timing
    const interactionStart = Date.now();

    // Perform rapid interactions
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="add-door-button"]');
      await page.fill('[data-testid="door-number-input"]', `${350 + i}`);
      await page.click('[data-testid="save-door-button"]');
    }

    const interactionTime = Date.now() - interactionStart;

    // All interactions should complete in under 5 seconds
    expect(interactionTime).toBeLessThan(5000);

    // Verify all entries were created
    const entryCount = await page.locator('[data-testid^="door-entry-"]').count();
    expect(entryCount).toBe(10);
  });
});

test.describe('Memory and Resource Usage', () => {
  test('should not have memory leaks', async ({ page }) => {
    await page.goto('/');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform memory-intensive operations
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="add-door-button"]');
      await page.fill('[data-testid="door-number-input"]', `${400 + i}`);
      await page.click('[data-testid="save-door-button"]');

      // Navigate to different pages
      await page.click('[data-testid="nav-pallets"]');
      await page.click('[data-testid="nav-shipping"]');
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory should not increase by more than 50MB
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

    console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (${memoryIncrease} bytes increase)`);
  });

  test('should handle offline storage efficiently', async ({ page }) => {
    await page.goto('/');

    // Test localStorage limits
    const storageTest = await page.evaluate(() => {
      const testData = {
        doorEntries: Array(1000).fill(null).map((_, i) => ({
          doorNumber: 332 + i,
          destination: '6024',
          freightType: '23/43',
          trailerStatus: 'partial',
          timestamp: Date.now()
        })),
        palletData: Array(123).fill(null).reduce((acc, _, i) => {
          acc[332 + i] = Math.floor(Math.random() * 50);
          return acc;
        }, {} as Record<number, number>)
      };

      try {
        localStorage.setItem('largeDataTest', JSON.stringify(testData));
        const retrieved = JSON.parse(localStorage.getItem('largeDataTest') || '{}');
        localStorage.removeItem('largeDataTest');

        return {
          success: true,
          dataSize: JSON.stringify(testData).length,
          retrievedCount: retrieved.doorEntries?.length || 0
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    expect(storageTest.success).toBe(true);
    expect(storageTest.retrievedCount).toBe(1000);

    console.log('Storage test:', storageTest);
  });
});

test.describe('API Performance', () => {
  test('should handle API responses efficiently', async ({ page }) => {
    // Mock API responses with delays
    await page.route('**/api/analyze', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: 'Performance test analysis',
          recommendations: ['Test recommendation 1', 'Test recommendation 2'],
          timestamp: new Date().toISOString()
        })
      });
    });

    await page.goto('/');

    // Add test data
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '350');
    await page.click('[data-testid="save-door-button"]');

    // Measure API response handling
    const apiStart = Date.now();
    await page.click('[data-testid="analyze-button"]');

    // Should show loading state immediately
    await expect(page.locator('[data-testid="analysis-loading"]')).toBeVisible();

    // Should handle response within reasonable time
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 5000 });

    const apiTime = Date.now() - apiStart;

    // Total handling time should be reasonable
    expect(apiTime).toBeLessThan(3000);

    console.log(`API response handling time: ${apiTime}ms`);
  });

  test('should handle concurrent API requests', async ({ page }) => {
    // Mock multiple API endpoints
    await page.route('**/api/health', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', timestamp: Date.now() })
    }));

    await page.route('**/api/metrics', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ performance: { uptime: 3600 }, timestamp: Date.now() })
    }));

    await page.route('**/api/analyze', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ analysis: 'Concurrent test', timestamp: Date.now() })
    }));

    await page.goto('/');

    // Trigger multiple API calls concurrently
    const startTime = Date.now();

    await Promise.all([
      page.evaluate(() => fetch('/api/health')),
      page.evaluate(() => fetch('/api/metrics')),
      page.evaluate(() => fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doorEntries: [], palletData: {} })
      }))
    ]);

    const concurrentTime = Date.now() - startTime;

    // Concurrent requests should complete quickly
    expect(concurrentTime).toBeLessThan(2000);

    console.log(`Concurrent API requests completed in: ${concurrentTime}ms`);
  });
});