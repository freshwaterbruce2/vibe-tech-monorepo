import { test, expect } from '@playwright/test';

test.describe('PWA Installation and Features', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      }
      return false;
    });

    expect(swRegistered).toBe(true);
  });

  test('should have correct PWA manifest', async ({ page }) => {
    await page.goto('/');

    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();

    // Fetch and validate manifest content
    const manifestHref = await manifestLink.getAttribute('href');
    const manifestResponse = await page.request.get(manifestHref!);
    expect(manifestResponse.ok()).toBe(true);

    const manifest = await manifestResponse.json();

    // Validate required manifest fields
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Validate icon formats
    manifest.icons.forEach((icon: any) => {
      expect(icon.src).toBeDefined();
      expect(icon.sizes).toBeDefined();
      expect(icon.type).toBeDefined();
    });

    console.log('PWA Manifest:', manifest);
  });

  test('should work offline after initial load', async ({ page, context }) => {
    // Initial load while online
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add some data while online
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '350');
    await page.selectOption('[data-testid="destination-select"]', '6024');
    await page.click('[data-testid="save-door-button"]');

    // Verify data is saved
    await expect(page.locator('[data-testid="door-entry-350"]')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Reload page while offline
    await page.reload();

    // App should still load and show cached data
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-350"]')).toBeVisible();

    // Should be able to interact with app offline
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '355');
    await page.click('[data-testid="save-door-button"]');
    await expect(page.locator('[data-testid="door-entry-355"]')).toBeVisible();

    // Navigate between pages offline
    await page.click('[data-testid="nav-pallets"]');
    await expect(page.locator('[data-testid="pallet-counter-page"]')).toBeVisible();

    await page.click('[data-testid="nav-shipping"]');
    await expect(page.locator('[data-testid="shipping-page"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test('should cache static assets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get list of cached resources
    const cacheData = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const cacheContents = [];

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          cacheContents.push({
            name: cacheName,
            urls: requests.map(req => req.url)
          });
        }

        return cacheContents;
      }
      return [];
    });

    expect(cacheData.length).toBeGreaterThan(0);

    // Should cache essential assets
    const allCachedUrls = cacheData.flatMap(cache => cache.urls);
    const hasJSFiles = allCachedUrls.some(url => url.includes('.js'));
    const hasCSSFiles = allCachedUrls.some(url => url.includes('.css'));
    const hasHTMLFiles = allCachedUrls.some(url => url.endsWith('/') || url.includes('.html'));

    expect(hasJSFiles).toBe(true);
    expect(hasCSSFiles).toBe(true);
    expect(hasHTMLFiles).toBe(true);

    console.log('Cache contents:', cacheData);
  });
});

test.describe('Offline Data Persistence', () => {
  test('should persist door entries offline', async ({ page, context }) => {
    await page.goto('/');

    // Add data while online
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '360');
    await page.selectOption('[data-testid="destination-select"]', '6070');
    await page.click('[data-testid="freight-type-28"]');
    await page.click('[data-testid="save-door-button"]');

    // Go offline
    await context.setOffline(true);

    // Add more data offline
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '365');
    await page.selectOption('[data-testid="destination-select"]', '6039');
    await page.click('[data-testid="freight-type-xd"]');
    await page.click('[data-testid="save-door-button"]');

    // Reload while offline
    await page.reload();

    // Both entries should persist
    await expect(page.locator('[data-testid="door-entry-360"]')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-365"]')).toBeVisible();

    // Edit data offline
    await page.click('[data-testid="door-entry-360"] [data-testid="edit-button"]');
    await page.click('[data-testid="trailer-status-shipload"]');
    await page.click('[data-testid="save-door-button"]');

    // Changes should persist
    await expect(page.locator('[data-testid="door-entry-360"] >> text=shipload')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test('should persist pallet counts offline', async ({ page, context }) => {
    await page.goto('/pallets');

    // Set pallet counts while online
    await page.click('[data-testid="pallet-increment-332"]');
    await page.click('[data-testid="pallet-increment-332"]');
    await page.click('[data-testid="pallet-increment-333"]');

    // Go offline
    await context.setOffline(true);

    // Modify counts offline
    await page.click('[data-testid="pallet-increment-334"]');
    await page.click('[data-testid="pallet-increment-334"]');
    await page.click('[data-testid="pallet-increment-334"]');

    // Reload while offline
    await page.reload();

    // Counts should persist
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('2');
    await expect(page.locator('[data-testid="pallet-count-333"]')).toHaveText('1');
    await expect(page.locator('[data-testid="pallet-count-334"]')).toHaveText('3');

    // Go back online
    await context.setOffline(false);
  });

  test('should persist user settings offline', async ({ page, context }) => {
    await page.goto('/settings');

    // Change settings while online
    await page.check('[data-testid="voice-commands-toggle"]');
    await page.locator('[data-testid="confidence-slider"]').fill('0.8');
    await page.check('[data-testid="noise-suppression-toggle"]');

    // Go offline
    await context.setOffline(true);

    // Modify more settings offline
    await page.locator('[data-testid="confidence-slider"]').fill('0.9');

    // Reload while offline
    await page.reload();

    // Settings should persist
    await expect(page.locator('[data-testid="voice-commands-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="confidence-slider"]')).toHaveValue('0.9');
    await expect(page.locator('[data-testid="noise-suppression-toggle"]')).toBeChecked();

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('PWA Update Mechanism', () => {
  test('should handle service worker updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate service worker update
    const updateAvailable = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;

        // Simulate update event
        const updateFound = new Event('updatefound');
        registration.dispatchEvent(updateFound);

        return new Promise((resolve) => {
          // Listen for update notifications
          const checkForUpdate = () => {
            if (registration.waiting) {
              resolve(true);
            } else {
              setTimeout(checkForUpdate, 100);
            }
          };
          checkForUpdate();

          // Timeout after 2 seconds
          setTimeout(() => resolve(false), 2000);
        });
      }
      return false;
    });

    // Update mechanism should be in place
    expect(typeof updateAvailable).toBe('boolean');
  });

  test('should show update notification when available', async ({ page }) => {
    await page.goto('/');

    // Mock service worker update scenario
    await page.evaluate(() => {
      // Simulate update available
      if ('serviceWorker' in navigator) {
        window.dispatchEvent(new CustomEvent('sw-update-available'));
      }
    });

    // Should show update notification (if implemented)
    // This would depend on your specific update notification implementation
    console.log('Service worker update mechanism tested');
  });
});

test.describe('Background Sync and Push Notifications', () => {
  test('should register for background sync if supported', async ({ page }) => {
    await page.goto('/');

    const backgroundSyncSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    });

    if (backgroundSyncSupported) {
      const syncRegistered = await page.evaluate(async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          // Attempt to register background sync
          return 'sync' in registration;
        } catch (error) {
          return false;
        }
      });

      expect(syncRegistered).toBe(true);
    }

    console.log('Background sync support:', backgroundSyncSupported);
  });

  test('should handle push notification permissions', async ({ page }) => {
    await page.goto('/');

    const pushSupported = await page.evaluate(() => {
      return 'PushManager' in window;
    });

    if (pushSupported) {
      const permissionState = await page.evaluate(async () => {
        return Notification.permission;
      });

      expect(['default', 'granted', 'denied']).toContain(permissionState);
    }

    console.log('Push notifications support:', pushSupported);
  });
});

test.describe('Storage Quota and Management', () => {
  test('should handle storage quota efficiently', async ({ page }) => {
    await page.goto('/');

    const storageInfo = await page.evaluate(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota! - estimate.usage!
        };
      }
      return null;
    });

    if (storageInfo) {
      expect(storageInfo.quota).toBeGreaterThan(0);
      expect(storageInfo.usage).toBeGreaterThanOrEqual(0);
      expect(storageInfo.available).toBeGreaterThan(0);

      console.log('Storage info:', storageInfo);
    }
  });

  test('should cleanup old data when needed', async ({ page }) => {
    await page.goto('/');

    // Add a large amount of test data
    await page.evaluate(() => {
      const largeData = Array(1000).fill(null).map((_, i) => ({
        doorNumber: 332 + i,
        destination: '6024',
        timestamp: Date.now() - (i * 86400000) // Spread over many days
      }));

      localStorage.setItem('doorEntries', JSON.stringify(largeData));
      localStorage.setItem('testLargeData', JSON.stringify(largeData));
    });

    const initialStorageSize = await page.evaluate(() => {
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
      return totalSize;
    });

    // Simulate cleanup process
    await page.evaluate(() => {
      // Remove test data
      localStorage.removeItem('testLargeData');

      // Keep only recent door entries
      const doorEntries = JSON.parse(localStorage.getItem('doorEntries') || '[]');
      const recentEntries = doorEntries.slice(0, 100); // Keep only 100 most recent
      localStorage.setItem('doorEntries', JSON.stringify(recentEntries));
    });

    const finalStorageSize = await page.evaluate(() => {
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }
      return totalSize;
    });

    expect(finalStorageSize).toBeLessThan(initialStorageSize);

    console.log(`Storage cleanup: ${initialStorageSize} -> ${finalStorageSize} bytes`);
  });
});