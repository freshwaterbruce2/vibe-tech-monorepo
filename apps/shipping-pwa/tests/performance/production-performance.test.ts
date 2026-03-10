/**
 * Production Performance Tests
 * Tests performance of production builds, PWA features, and critical user flows
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import lighthouse from 'lighthouse';
import { performance } from 'perf_hooks';

// Performance measurement utilities
class PerformanceMetrics {
  private measurements = new Map<string, number[]>();

  startTiming(name: string): number {
    return performance.now();
  }

  endTiming(name: string, startTime: number): number {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return duration;
  }

  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getPercentile(name: string, percentile: number): number {
    const times = this.measurements.get(name) || [];
    if (times.length === 0) return 0;

    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getAllMetrics(): Record<string, { avg: number; p95: number; p99: number }> {
    const result: Record<string, { avg: number; p95: number; p99: number }> = {};

    for (const [name] of this.measurements) {
      result[name] = {
        avg: this.getAverageTime(name),
        p95: this.getPercentile(name, 95),
        p99: this.getPercentile(name, 99)
      };
    }

    return result;
  }
}

// Mock data generators for performance testing
const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `door-${i}`,
    doorNumber: 332 + (i % 123), // Valid door range
    destination: ['6024', '6070', '6039', '6040', '7045'][i % 5],
    freightType: ['23/43', '28', 'XD'][i % 3],
    trailerStatus: ['partial', 'empty', 'shipload'][i % 3],
    timestamp: new Date(Date.now() - i * 60000),
    palletCount: Math.floor(Math.random() * 50) + 1
  }));
};

describe('Production Performance Tests', () => {
  let browser: Browser;
  let page: Page;
  let metrics: PerformanceMetrics;
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu'
      ]
    });
    metrics = new PerformanceMetrics();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }

    // Output performance summary
    const allMetrics = metrics.getAllMetrics();
    console.log('\n=== Performance Test Summary ===');
    for (const [name, data] of Object.entries(allMetrics)) {
      console.log(`${name}:`);
      console.log(`  Average: ${data.avg.toFixed(2)}ms`);
      console.log(`  95th percentile: ${data.p95.toFixed(2)}ms`);
      console.log(`  99th percentile: ${data.p99.toFixed(2)}ms`);
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();

    // Set up performance monitoring
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setCacheEnabled(false); // Disable cache for consistent measurements

    // Enable request interception for monitoring
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Page Load Performance', () => {
    test('should load initial page within performance budget', async () => {
      const startTime = metrics.startTiming('initial-page-load');

      await page.goto(baseUrl, { waitUntil: 'networkidle0' });

      const endTime = metrics.endTiming('initial-page-load', startTime);

      // Performance budget: Initial page load should be under 3 seconds
      expect(endTime).toBeLessThan(3000);

      // Verify critical elements are present
      await expect(page.$('[data-testid="shipping-dashboard"]')).resolves.toBeTruthy();
    });

    test('should have fast Time to Interactive (TTI)', async () => {
      const startTime = metrics.startTiming('time-to-interactive');

      await page.goto(baseUrl);

      // Wait for page to be interactive
      await page.waitForSelector('[data-testid="door-number-input"]', { visible: true });
      await page.waitForFunction(() => document.readyState === 'complete');

      const endTime = metrics.endTiming('time-to-interactive', startTime);

      // TTI should be under 5 seconds
      expect(endTime).toBeLessThan(5000);
    });

    test('should have minimal Cumulative Layout Shift (CLS)', async () => {
      await page.goto(baseUrl);

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Measure layout shift using Performance Observer
      const clsValue = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });

          // Resolve after a short delay to capture initial shifts
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 2000);
        });
      });

      // CLS should be minimal (< 0.1 is good, < 0.25 is acceptable)
      expect(clsValue).toBeLessThan(0.25);
    });

    test('should load with minimal JavaScript bundle size', async () => {
      const responses: any[] = [];

      page.on('response', (response) => {
        if (response.url().includes('.js') && response.status() === 200) {
          responses.push({
            url: response.url(),
            size: parseInt(response.headers()['content-length'] || '0', 10)
          });
        }
      });

      await page.goto(baseUrl, { waitUntil: 'networkidle0' });

      const totalJSSize = responses.reduce((total, response) => total + response.size, 0);
      const totalJSSizeKB = totalJSSize / 1024;

      // JavaScript bundle should be under 1MB total
      expect(totalJSSizeKB).toBeLessThan(1024);

      // Log largest JS files for analysis
      const largestFiles = responses
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);

      console.log('Largest JS files:');
      largestFiles.forEach((file, i) => {
        console.log(`${i + 1}. ${file.url.split('/').pop()}: ${(file.size / 1024).toFixed(2)}KB`);
      });
    });
  });

  describe('Runtime Performance', () => {
    beforeEach(async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('[data-testid="shipping-dashboard"]');
    });

    test('should add door entries efficiently with large datasets', async () => {
      const largeDataset = generateLargeDataset(100);

      const startTime = metrics.startTiming('bulk-door-entry');

      // Simulate adding many door entries
      for (let i = 0; i < 10; i++) {
        const doorData = largeDataset[i];

        await page.fill('[data-testid="door-number-input"]', doorData.doorNumber.toString());
        await page.selectOption('[data-testid="destination-select"]', doorData.destination);
        await page.click('[data-testid="add-door-button"]');

        // Wait for entry to be added
        await page.waitForSelector(`[data-testid="door-entry-${doorData.doorNumber}"]`);
      }

      const endTime = metrics.endTiming('bulk-door-entry', startTime);

      // Adding 10 entries should take less than 2 seconds
      expect(endTime).toBeLessThan(2000);
    });

    test('should handle voice command processing efficiently', async () => {
      // Enable voice commands
      await page.click('[data-testid="voice-commands-toggle"]');
      await page.waitForSelector('[data-testid="voice-status-active"]');

      const voiceCommands = [
        'door 335',
        'door 336',
        'door 337',
        'doors 340 to 342',
        'delete door 335'
      ];

      const startTime = metrics.startTiming('voice-commands-processing');

      for (const command of voiceCommands) {
        await page.evaluate((cmd) => {
          window.dispatchEvent(new CustomEvent('mock-voice-command', { detail: cmd }));
        }, command);

        // Wait a bit for processing
        await page.waitForTimeout(100);
      }

      const endTime = metrics.endTiming('voice-commands-processing', startTime);

      // Voice command processing should be very fast
      expect(endTime).toBeLessThan(1000);
    });

    test('should export large datasets efficiently', async () => {
      // Add test data
      const testData = generateLargeDataset(50);

      // Simulate having data in localStorage
      await page.evaluate((data) => {
        localStorage.setItem('doorEntries', JSON.stringify(data.slice(0, 50)));
        localStorage.setItem('palletEntries', JSON.stringify(data.slice(0, 25)));
      }, testData);

      await page.reload();
      await page.waitForSelector('[data-testid="shipping-dashboard"]');

      const startTime = metrics.startTiming('data-export');

      await page.click('[data-testid="export-menu-trigger"]');
      await page.click('[data-testid="export-zip-button"]');

      // Wait for download to complete
      await page.waitForEvent('download');

      const endTime = metrics.endTiming('data-export', startTime);

      // Export should complete within 3 seconds even with large dataset
      expect(endTime).toBeLessThan(3000);
    });

    test('should maintain smooth scrolling with large lists', async () => {
      // Add many door entries
      const largeDataset = generateLargeDataset(200);

      await page.evaluate((data) => {
        localStorage.setItem('doorEntries', JSON.stringify(data));
      }, largeDataset);

      await page.reload();
      await page.waitForSelector('[data-testid="shipping-dashboard"]');

      const startTime = metrics.startTiming('scroll-performance');

      // Measure scroll performance
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="door-entries-list"]');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });

      await page.waitForTimeout(100);

      const endTime = metrics.endTiming('scroll-performance', startTime);

      // Scrolling should be smooth and fast
      expect(endTime).toBeLessThan(200);
    });
  });

  describe('PWA Performance', () => {
    test('should install service worker quickly', async () => {
      const startTime = metrics.startTiming('service-worker-install');

      await page.goto(baseUrl);

      // Wait for service worker to be registered
      await page.waitForFunction(() => {
        return navigator.serviceWorker.ready;
      });

      const endTime = metrics.endTiming('service-worker-install', startTime);

      // Service worker should install within 1 second
      expect(endTime).toBeLessThan(1000);
    });

    test('should cache resources efficiently', async () => {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });

      // Wait for service worker to cache resources
      await page.waitForTimeout(1000);

      const startTime = metrics.startTiming('cached-page-load');

      // Reload page to test cache
      await page.reload({ waitUntil: 'networkidle0' });

      const endTime = metrics.endTiming('cached-page-load', startTime);

      // Cached page load should be very fast
      expect(endTime).toBeLessThan(1000);
    });

    test('should work offline efficiently', async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('[data-testid="shipping-dashboard"]');

      // Go offline
      await page.setOffline(true);

      const startTime = metrics.startTiming('offline-operation');

      // Try to add door entry while offline
      await page.fill('[data-testid="door-number-input"]', '350');
      await page.selectOption('[data-testid="destination-select"]', '6024');
      await page.click('[data-testid="add-door-button"]');

      // Wait for offline entry to appear
      await page.waitForSelector('[data-testid="door-entry-350"]');

      const endTime = metrics.endTiming('offline-operation', startTime);

      // Offline operations should be fast
      expect(endTime).toBeLessThan(500);

      // Go back online
      await page.setOffline(false);
    });
  });

  describe('Memory Performance', () => {
    test('should not have memory leaks during extended use', async () => {
      await page.goto(baseUrl);
      await page.waitForSelector('[data-testid="shipping-dashboard"]');

      // Get initial memory usage
      const initialMemory = await page.metrics();

      // Simulate extended use
      for (let i = 0; i < 20; i++) {
        // Add and remove door entries
        await page.fill('[data-testid="door-number-input"]', (350 + i).toString());
        await page.click('[data-testid="add-door-button"]');
        await page.waitForSelector(`[data-testid="door-entry-${350 + i}"]`);

        if (i > 10) {
          await page.click(`[data-testid="delete-door-${350 + i - 10}"]`);
          await page.click('[data-testid="confirm-delete-button"]');
        }

        // Navigate between pages
        if (i % 5 === 0) {
          await page.click('[data-testid="nav-pallet-counter"]');
          await page.waitForSelector('[data-testid="pallet-counter"]');
          await page.click('[data-testid="nav-shipping"]');
          await page.waitForSelector('[data-testid="shipping-dashboard"]');
        }
      }

      // Get final memory usage
      const finalMemory = await page.metrics();

      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.JSHeapUsedSize - initialMemory.JSHeapUsedSize;
      const memoryIncreaseKB = memoryIncrease / 1024;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncreaseKB).toBeLessThan(10240);
    });

    test('should garbage collect efficiently', async () => {
      await page.goto(baseUrl);

      // Force garbage collection and measure
      const initialMemory = await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Create and destroy many objects
      await page.evaluate(() => {
        const largeArray = new Array(100000).fill(0).map((_, i) => ({
          id: i,
          data: 'x'.repeat(100)
        }));
        // Clear reference
        return largeArray.length;
      });

      // Force garbage collection again
      const finalMemory = await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory should not have increased significantly after GC
      const memoryDifference = finalMemory - initialMemory;
      expect(memoryDifference).toBeLessThan(1024 * 1024); // Less than 1MB difference
    });
  });

  describe('Lighthouse Performance Audit', () => {
    test('should meet Lighthouse performance standards', async () => {
      // Run Lighthouse audit
      const { lhr } = await lighthouse(baseUrl, {
        port: 9222,
        output: 'json',
        onlyCategories: ['performance'],
        settings: {
          maxWaitForFcp: 15 * 1000,
          maxWaitForLoad: 35 * 1000,
          throttlingMethod: 'simulate',
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
            requestLatencyMs: 0,
            downloadThroughputKbps: 0,
            uploadThroughputKbps: 0
          }
        }
      });

      const performanceScore = lhr.categories.performance.score * 100;

      // Performance score should be at least 90
      expect(performanceScore).toBeGreaterThanOrEqual(90);

      // Check specific metrics
      const metrics = lhr.audits;

      // First Contentful Paint should be under 1.8s
      const fcp = metrics['first-contentful-paint'].numericValue;
      expect(fcp).toBeLessThan(1800);

      // Largest Contentful Paint should be under 2.5s
      const lcp = metrics['largest-contentful-paint'].numericValue;
      expect(lcp).toBeLessThan(2500);

      // Total Blocking Time should be under 200ms
      const tbt = metrics['total-blocking-time'].numericValue;
      expect(tbt).toBeLessThan(200);

      // Cumulative Layout Shift should be under 0.1
      const cls = metrics['cumulative-layout-shift'].numericValue;
      expect(cls).toBeLessThan(0.1);

      console.log('Lighthouse Performance Metrics:');
      console.log(`Overall Score: ${performanceScore}`);
      console.log(`First Contentful Paint: ${fcp}ms`);
      console.log(`Largest Contentful Paint: ${lcp}ms`);
      console.log(`Total Blocking Time: ${tbt}ms`);
      console.log(`Cumulative Layout Shift: ${cls}`);
    });
  });

  describe('Network Performance', () => {
    test('should handle slow networks gracefully', async () => {
      // Simulate slow network
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500kb/s
        uploadThroughput: 500 * 1024 / 8,
        latency: 2000 // 2s latency
      });

      const startTime = metrics.startTiming('slow-network-load');

      await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      const endTime = metrics.endTiming('slow-network-load', startTime);

      // Should still load within reasonable time even on slow network
      expect(endTime).toBeLessThan(15000); // 15 seconds

      // Verify critical functionality works
      await page.waitForSelector('[data-testid="shipping-dashboard"]');
      await expect(page.$('[data-testid="door-number-input"]')).resolves.toBeTruthy();
    });

    test('should minimize API calls', async () => {
      let apiCallCount = 0;

      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/') || url.includes('firestore') || url.includes('square')) {
          apiCallCount++;
        }
      });

      await page.goto(baseUrl);
      await page.waitForSelector('[data-testid="shipping-dashboard"]');

      // Perform common operations
      await page.fill('[data-testid="door-number-input"]', '350');
      await page.click('[data-testid="add-door-button"]');
      await page.click('[data-testid="nav-pallet-counter"]');
      await page.click('[data-testid="nav-shipping"]');

      // API calls should be minimal for efficient performance
      expect(apiCallCount).toBeLessThan(10);
    });
  });
});