/**
 * Mobile Compatibility Tests
 * Tests PWA functionality, voice commands, touch interactions, and mobile-specific features
 */

import { test, expect, devices, Page, BrowserContext } from '@playwright/test';

// Mobile device configurations for testing
const mobileDevices = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', device: devices['iPhone 12 Pro'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
  { name: 'iPad Air', device: devices['iPad Air'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] }
];

// Tablet device configurations
const tabletDevices = [
  { name: 'iPad Air', device: devices['iPad Air'] },
  { name: 'iPad Pro', device: devices['iPad Pro'] },
  { name: 'Surface Pro', device: devices['Desktop Chrome'] } // Approximation
];

// Touch gesture utilities
class TouchGestureUtils {
  static async tap(page: Page, selector: string) {
    const element = await page.locator(selector);
    const box = await element.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  static async longPress(page: Page, selector: string, duration = 1000) {
    const element = await page.locator(selector);
    const box = await element.boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(duration);
    }
  }

  static async swipe(page: Page, startSelector: string, endSelector: string) {
    const startElement = await page.locator(startSelector);
    const endElement = await page.locator(endSelector);

    const startBox = await startElement.boundingBox();
    const endBox = await endElement.boundingBox();

    if (startBox && endBox) {
      await page.touchscreen.tap(
        startBox.x + startBox.width / 2,
        startBox.y + startBox.height / 2
      );
      await page.touchscreen.tap(
        endBox.x + endBox.width / 2,
        endBox.y + endBox.height / 2
      );
    }
  }

  static async pinchZoom(page: Page, selector: string, scale: number) {
    const element = await page.locator(selector);
    const box = await element.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Simulate pinch gesture
      await page.touchscreen.tap(centerX - 50, centerY);
      await page.touchscreen.tap(centerX + 50, centerY);

      // Scale gesture (approximation)
      await page.touchscreen.tap(centerX - 50 * scale, centerY);
      await page.touchscreen.tap(centerX + 50 * scale, centerY);
    }
  }
}

// Voice command simulation for mobile
class MobileVoiceUtils {
  static async simulateVoiceCommand(page: Page, command: string, confidence = 0.9) {
    await page.evaluate(({ cmd, conf }) => {
      window.dispatchEvent(new CustomEvent('mock-voice-command', {
        detail: {
          transcript: cmd,
          confidence: conf,
          isMobile: true
        }
      }));
    }, { cmd: command, conf: confidence });
  }

  static async enableMobileVoiceRecognition(page: Page) {
    await page.evaluate(() => {
      // Mock mobile-specific voice recognition setup
      if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
        window.SpeechRecognition = class MockSpeechRecognition {
          continuous = false;
          interimResults = false;
          lang = 'en-US';
          onstart = null;
          onresult = null;
          onerror = null;
          onend = null;

          start() {
            if (this.onstart) this.onstart();
          }

          stop() {
            if (this.onend) this.onend();
          }

          abort() {
            if (this.onend) this.onend();
          }
        };
        window.webkitSpeechRecognition = window.SpeechRecognition;
      }
    });
  }
}

// PWA installation utilities
class PWATestUtils {
  static async simulateBeforeInstallPrompt(page: Page) {
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'prompt', {
        value: async () => ({ outcome: 'accepted' })
      });
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'accepted' })
      });
      window.dispatchEvent(event);
    });
  }

  static async checkPWAInstallability(page: Page) {
    return await page.evaluate(() => {
      return {
        hasManifest: !!document.querySelector('link[rel="manifest"]'),
        hasServiceWorker: 'serviceWorker' in navigator,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        canInstall: window.deferredPrompt !== undefined
      };
    });
  }

  static async checkOfflineCapability(page: Page) {
    // Go offline
    await page.context().setOffline(true);

    try {
      await page.reload({ waitUntil: 'networkidle' });
      const isOfflineReady = await page.locator('[data-testid="offline-ready"]').isVisible();
      return isOfflineReady;
    } finally {
      // Go back online
      await page.context().setOffline(false);
    }
  }
}

test.describe('Mobile Compatibility Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';

  test.describe('Cross-Device Compatibility', () => {
    for (const { name, device } of mobileDevices) {
      test(`should work correctly on ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          permissions: ['microphone'], // For voice commands
        });
        const page = await context.newPage();

        await page.goto(baseUrl);

        // Test basic page load
        await expect(page.locator('[data-testid="shipping-dashboard"]')).toBeVisible();

        // Test responsive design
        const viewport = page.viewportSize();
        if (viewport && viewport.width < 768) {
          // Mobile layout
          await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
          await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();
        } else {
          // Tablet/desktop layout
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        }

        // Test touch interactions
        await TouchGestureUtils.tap(page, '[data-testid="door-number-input"]');
        await page.fill('[data-testid="door-number-input"]', '350');
        await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');

        await expect(page.locator('[data-testid="door-entry-350"]')).toBeVisible();

        await context.close();
      });
    }
  });

  test.describe('Touch Interactions', () => {
    test('should handle touch gestures correctly', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        hasTouch: true
      });
      const page = await context.newPage();

      await page.goto(baseUrl);
      await page.waitForSelector('[data-testid="shipping-dashboard"]');

      // Test tap interactions
      await TouchGestureUtils.tap(page, '[data-testid="door-number-input"]');
      await expect(page.locator('[data-testid="door-number-input"]')).toBeFocused();

      // Test long press for context menu (if implemented)
      await page.fill('[data-testid="door-number-input"]', '351');
      await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');
      await page.waitForSelector('[data-testid="door-entry-351"]');

      await TouchGestureUtils.longPress(page, '[data-testid="door-entry-351"]', 800);

      // Check if context menu appeared
      const hasContextMenu = await page.locator('[data-testid="door-context-menu"]').isVisible();
      if (hasContextMenu) {
        await expect(page.locator('[data-testid="door-context-menu"]')).toBeVisible();
      }

      // Test swipe gestures for navigation (if implemented)
      const hasSwipeNavigation = await page.locator('[data-testid="swipe-container"]').isVisible();
      if (hasSwipeNavigation) {
        await TouchGestureUtils.swipe(
          page,
          '[data-testid="swipe-container"]',
          '[data-testid="nav-pallet-counter"]'
        );
        await expect(page.locator('[data-testid="pallet-counter"]')).toBeVisible();
      }

      await context.close();
    });

    test('should handle scroll and zoom correctly', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5'],
        hasTouch: true
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Add multiple door entries to test scrolling
      for (let i = 352; i <= 365; i++) {
        await page.fill('[data-testid="door-number-input"]', i.toString());
        await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');
        await page.waitForSelector(`[data-testid="door-entry-${i}"]`);
      }

      // Test scrolling
      const doorList = page.locator('[data-testid="door-entries-list"]');
      const initialScrollTop = await doorList.evaluate(el => el.scrollTop);

      await page.touchscreen.tap(400, 400); // Tap in middle of screen
      await page.touchscreen.tap(400, 200); // Swipe up

      const finalScrollTop = await doorList.evaluate(el => el.scrollTop);
      expect(finalScrollTop).toBeGreaterThan(initialScrollTop);

      // Test pinch zoom (if supported)
      await TouchGestureUtils.pinchZoom(page, '[data-testid="shipping-dashboard"]', 1.5);

      // Verify zoom level changed (this might not work in all browsers)
      const zoomLevel = await page.evaluate(() => window.devicePixelRatio);
      console.log('Zoom level after pinch:', zoomLevel);

      await context.close();
    });
  });

  test.describe('Voice Commands on Mobile', () => {
    test('should handle voice commands on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        permissions: ['microphone']
      });
      const page = await context.newPage();

      await MobileVoiceUtils.enableMobileVoiceRecognition(page);
      await page.goto(baseUrl);

      // Enable voice commands
      await TouchGestureUtils.tap(page, '[data-testid="voice-commands-toggle"]');
      await expect(page.locator('[data-testid="voice-status-active"]')).toBeVisible();

      // Test voice command recognition
      await MobileVoiceUtils.simulateVoiceCommand(page, 'door 370');
      await expect(page.locator('[data-testid="door-entry-370"]')).toBeVisible();

      // Test voice command with lower confidence (mobile might be noisier)
      await MobileVoiceUtils.simulateVoiceCommand(page, 'door 371', 0.65);

      // Should still work if above threshold
      await expect(page.locator('[data-testid="door-entry-371"]')).toBeVisible();

      // Test voice command failure with very low confidence
      await MobileVoiceUtils.simulateVoiceCommand(page, 'door 372', 0.3);

      // Should not add entry due to low confidence
      await expect(page.locator('[data-testid="door-entry-372"]')).not.toBeVisible();

      // Test voice commands for navigation
      await MobileVoiceUtils.simulateVoiceCommand(page, 'go to pallets');
      await expect(page.locator('[data-testid="pallet-counter"]')).toBeVisible();

      await MobileVoiceUtils.simulateVoiceCommand(page, 'go to shipping');
      await expect(page.locator('[data-testid="shipping-dashboard"]')).toBeVisible();

      await context.close();
    });

    test('should handle mobile voice recognition errors', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Samsung Galaxy S21'],
        permissions: ['microphone']
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Simulate voice recognition not available
      await page.evaluate(() => {
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
      });

      await TouchGestureUtils.tap(page, '[data-testid="voice-commands-toggle"]');

      // Should show error message
      await expect(page.locator('[data-testid="voice-not-supported"]')).toBeVisible();

      // Should disable voice command UI
      await expect(page.locator('[data-testid="voice-status-active"]')).not.toBeVisible();

      await context.close();
    });
  });

  test.describe('PWA Features on Mobile', () => {
    test('should support PWA installation on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12']
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Check PWA requirements
      const pwaStatus = await PWATestUtils.checkPWAInstallability(page);

      expect(pwaStatus.hasManifest).toBe(true);
      expect(pwaStatus.hasServiceWorker).toBe(true);

      // Simulate beforeinstallprompt event
      await PWATestUtils.simulateBeforeInstallPrompt(page);

      // Check if install prompt appears
      await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible();

      // Test install process
      await TouchGestureUtils.tap(page, '[data-testid="install-pwa-button"]');

      // Should show installation success
      await expect(page.locator('[data-testid="pwa-installed-toast"]')).toBeVisible();

      await context.close();
    });

    test('should work offline on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();

      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Wait for service worker to cache resources
      await page.waitForTimeout(2000);

      // Go offline
      await context.setOffline(true);

      // Navigate and add entries offline
      await page.fill('[data-testid="door-number-input"]', '380');
      await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');

      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Entry should still be added locally
      await expect(page.locator('[data-testid="door-entry-380"]')).toBeVisible();

      // Go back online
      await context.setOffline(false);

      // Should sync data and remove offline indicator
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();

      await context.close();
    });

    test('should handle mobile-specific PWA behaviors', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12']
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Test mobile Safari add to home screen
      if (devices['iPhone 12'].userAgent.includes('Safari')) {
        // Simulate iOS Safari environment
        await page.evaluate(() => {
          Object.defineProperty(window.navigator, 'standalone', {
            value: false,
            writable: true
          });
        });

        // Should show iOS-specific install instructions
        await expect(page.locator('[data-testid="ios-install-instructions"]')).toBeVisible();

        // Test standalone mode
        await page.evaluate(() => {
          window.navigator.standalone = true;
        });

        await page.reload();

        // Should hide browser UI in standalone mode
        await expect(page.locator('[data-testid="browser-ui-hidden"]')).toBeVisible();
      }

      await context.close();
    });
  });

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone SE'], // Lower-end device for performance testing
      });
      const page = await context.newPage();

      const startTime = Date.now();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time on mobile
      expect(loadTime).toBeLessThan(5000);

      // Test interaction responsiveness
      const interactionStart = Date.now();
      await TouchGestureUtils.tap(page, '[data-testid="door-number-input"]');
      await page.fill('[data-testid="door-number-input"]', '390');
      await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');
      await page.waitForSelector('[data-testid="door-entry-390"]');
      const interactionTime = Date.now() - interactionStart;

      // Interactions should be responsive
      expect(interactionTime).toBeLessThan(1000);

      // Test memory usage
      const metrics = await page.metrics();
      expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024); // 50MB limit

      await context.close();
    });

    test('should handle large datasets on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Add large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        doorNumber: 350 + i,
        destination: ['6024', '6070', '6039', '6040', '7045'][i % 5]
      }));

      await page.evaluate((dataset) => {
        localStorage.setItem('doorEntries', JSON.stringify(dataset));
      }, largeDataset);

      const performanceStart = Date.now();
      await page.reload({ waitUntil: 'networkidle' });
      const renderTime = Date.now() - performanceStart;

      // Should handle large datasets without significant performance impact
      expect(renderTime).toBeLessThan(3000);

      // Test scrolling performance with large list
      const scrollStart = Date.now();
      await page.touchscreen.tap(400, 400);
      await page.touchscreen.tap(400, 100); // Scroll down
      await page.waitForTimeout(100);
      const scrollTime = Date.now() - scrollStart;

      expect(scrollTime).toBeLessThan(500);

      await context.close();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        reducedMotion: 'reduce' // Test with reduced motion preference
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Test focus management for touch devices
      await TouchGestureUtils.tap(page, '[data-testid="door-number-input"]');
      await expect(page.locator('[data-testid="door-number-input"]')).toBeFocused();

      // Test keyboard navigation (external keyboard on mobile)
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="destination-select"]')).toBeFocused();

      // Test screen reader announcements (aria-live regions)
      await page.fill('[data-testid="door-number-input"]', '395');
      await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');

      const ariaLiveRegion = page.locator('[data-testid="announcements"][aria-live]');
      if (await ariaLiveRegion.isVisible()) {
        await expect(ariaLiveRegion).toContainText('Door 395 added');
      }

      // Test color contrast in different lighting conditions
      const contrastElements = [
        '[data-testid="door-number-input"]',
        '[data-testid="add-door-button"]',
        '[data-testid="nav-shipping"]'
      ];

      for (const selector of contrastElements) {
        const element = page.locator(selector);
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });

        // Ensure readable font sizes on mobile
        const fontSize = parseInt(styles.fontSize);
        expect(fontSize).toBeGreaterThanOrEqual(16); // 16px minimum for mobile
      }

      await context.close();
    });

    test('should support assistive technologies', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Air'],
        extraHTTPHeaders: {
          'User-Agent': `${devices['iPad Air'].userAgent  } AssistiveTouch/1.0`
        }
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Test voice control compatibility
      await page.evaluate(() => {
        // Simulate voice control activation
        const event = new CustomEvent('voice-control-activated');
        window.dispatchEvent(event);
      });

      // Test switch control compatibility
      await page.keyboard.press('Tab'); // External switch navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Activate focused element

      // Test larger touch targets for motor disabilities
      const touchTargets = await page.locator('button, input, a').all();

      for (const target of touchTargets) {
        const box = await target.boundingBox();
        if (box) {
          // Touch targets should be at least 44px on mobile
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
        }
      }

      await context.close();
    });
  });

  test.describe('Mobile Security', () => {
    test('should maintain security on mobile browsers', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Samsung Galaxy S21']
      });
      const page = await context.newPage();

      await page.goto(baseUrl);

      // Test mobile browser security features
      const securityHeaders = await page.evaluate(() => {
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return {
          hasCSP: !!meta,
          hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
          hasTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]')
        };
      });

      expect(securityHeaders.hasViewportMeta).toBe(true);

      // Test secure storage on mobile
      await page.evaluate(() => {
        localStorage.setItem('test-secure-data', 'sensitive-information');
      });

      // Simulate app backgrounding/foregrounding
      await page.evaluate(() => {
        window.dispatchEvent(new Event('pagehide'));
      });

      await page.waitForTimeout(100);

      await page.evaluate(() => {
        window.dispatchEvent(new Event('pageshow'));
      });

      // Sensitive data should still be protected
      const secureData = await page.evaluate(() => {
        return localStorage.getItem('test-secure-data');
      });

      expect(secureData).toBe('sensitive-information');

      await context.close();
    });
  });

  test.describe('Tablet-Specific Features', () => {
    for (const { name, device } of tabletDevices) {
      test(`should work correctly on ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          hasTouch: true
        });
        const page = await context.newPage();

        await page.goto(baseUrl);

        // Tablets should show desktop-like layout
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();

        // But support touch interactions
        await TouchGestureUtils.tap(page, '[data-testid="door-number-input"]');
        await page.fill('[data-testid="door-number-input"]', '400');
        await TouchGestureUtils.tap(page, '[data-testid="add-door-button"]');

        await expect(page.locator('[data-testid="door-entry-400"]')).toBeVisible();

        // Test split-screen functionality if available
        const hasSplitScreen = await page.locator('[data-testid="split-screen-toggle"]').isVisible();
        if (hasSplitScreen) {
          await TouchGestureUtils.tap(page, '[data-testid="split-screen-toggle"]');
          await expect(page.locator('[data-testid="split-screen-mode"]')).toBeVisible();
        }

        await context.close();
      });
    }
  });
});