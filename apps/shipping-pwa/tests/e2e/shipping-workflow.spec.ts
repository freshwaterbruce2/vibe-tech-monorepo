import { test, expect, Page } from '@playwright/test';

test.describe('Shipping PWA Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app to initialize
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="app-title"]')).toBeVisible();
  });

  test('should display main navigation and routing', async ({ page }) => {
    // Test navigation elements
    await expect(page.locator('[data-testid="nav-shipping"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-pallets"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-notes"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();

    // Test routing
    await page.click('[data-testid="nav-pallets"]');
    await expect(page.locator('[data-testid="pallet-counter-page"]')).toBeVisible();

    await page.click('[data-testid="nav-shipping"]');
    await expect(page.locator('[data-testid="shipping-page"]')).toBeVisible();
  });

  test('should create and manage door entries', async ({ page }) => {
    // Add a new door entry
    await page.click('[data-testid="add-door-button"]');

    // Fill door form
    await page.fill('[data-testid="door-number-input"]', '350');
    await page.selectOption('[data-testid="destination-select"]', '6024');
    await page.click('[data-testid="freight-type-28"]');
    await page.click('[data-testid="trailer-status-shipload"]');

    // Save door entry
    await page.click('[data-testid="save-door-button"]');

    // Verify door entry appears in list
    await expect(page.locator('[data-testid="door-entry-350"]')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-350"] >> text=350')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-350"] >> text=6024')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-350"] >> text=28')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-350"] >> text=shipload')).toBeVisible();
  });

  test('should handle door entry validation', async ({ page }) => {
    await page.click('[data-testid="add-door-button"]');

    // Try invalid door number
    await page.fill('[data-testid="door-number-input"]', '999');
    await page.click('[data-testid="save-door-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('text=Door number must be between 332 and 454')).toBeVisible();

    // Fix with valid door number
    await page.fill('[data-testid="door-number-input"]', '400');
    await page.click('[data-testid="save-door-button"]');

    // Error should disappear and door should be added
    await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="door-entry-400"]')).toBeVisible();
  });

  test('should edit and delete door entries', async ({ page }) => {
    // First add a door entry
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '370');
    await page.selectOption('[data-testid="destination-select"]', '6070');
    await page.click('[data-testid="save-door-button"]');

    // Edit the door entry
    await page.click('[data-testid="door-entry-370"] [data-testid="edit-button"]');
    await page.selectOption('[data-testid="destination-select"]', '6039');
    await page.click('[data-testid="freight-type-xd"]');
    await page.click('[data-testid="save-door-button"]');

    // Verify changes
    await expect(page.locator('[data-testid="door-entry-370"] >> text=6039')).toBeVisible();
    await expect(page.locator('[data-testid="door-entry-370"] >> text=XD')).toBeVisible();

    // Delete the door entry
    await page.click('[data-testid="door-entry-370"] [data-testid="delete-button"]');
    await page.click('[data-testid="confirm-delete"]');

    // Verify deletion
    await expect(page.locator('[data-testid="door-entry-370"]')).not.toBeVisible();
  });

  test('should export data as CSV', async ({ page }) => {
    // Add some test data
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '340');
    await page.selectOption('[data-testid="destination-select"]', '6024');
    await page.click('[data-testid="save-door-button"]');

    // Start download and verify
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv-button"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/door-entries-\d{8}-\d{6}\.csv/);
  });
});

test.describe('Pallet Counter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pallets');
    await page.waitForLoadState('networkidle');
  });

  test('should increment and decrement pallet counts', async ({ page }) => {
    // Test increment
    await page.click('[data-testid="pallet-increment-332"]');
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('1');

    await page.click('[data-testid="pallet-increment-332"]');
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('2');

    // Test decrement
    await page.click('[data-testid="pallet-decrement-332"]');
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('1');

    // Test can't go below zero
    await page.click('[data-testid="pallet-decrement-332"]');
    await page.click('[data-testid="pallet-decrement-332"]');
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('0');
  });

  test('should reset all pallet counts', async ({ page }) => {
    // Set some counts
    await page.click('[data-testid="pallet-increment-332"]');
    await page.click('[data-testid="pallet-increment-333"]');
    await page.click('[data-testid="pallet-increment-334"]');

    // Reset all
    await page.click('[data-testid="reset-all-button"]');
    await page.click('[data-testid="confirm-reset"]');

    // Verify all counts are zero
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('0');
    await expect(page.locator('[data-testid="pallet-count-333"]')).toHaveText('0');
    await expect(page.locator('[data-testid="pallet-count-334"]')).toHaveText('0');
  });
});

test.describe('Voice Commands Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should enable and configure voice commands', async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');

    // Enable voice commands
    await page.check('[data-testid="voice-commands-toggle"]');
    await expect(page.locator('[data-testid="voice-commands-toggle"]')).toBeChecked();

    // Test voice command tutorial
    await page.click('[data-testid="voice-tutorial-button"]');
    await expect(page.locator('[data-testid="voice-tutorial-modal"]')).toBeVisible();

    // Test voice command examples
    await expect(page.locator('text=door 350')).toBeVisible();
    await expect(page.locator('text=doors 340 to 350')).toBeVisible();
    await expect(page.locator('text=delete door 350')).toBeVisible();
  });

  test('should adjust voice recognition settings', async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');

    // Test confidence threshold slider
    await page.locator('[data-testid="confidence-slider"]').fill('0.8');

    // Test noise suppression toggle
    await page.check('[data-testid="noise-suppression-toggle"]');
    await expect(page.locator('[data-testid="noise-suppression-toggle"]')).toBeChecked();

    // Settings should persist
    await page.reload();
    await expect(page.locator('[data-testid="confidence-slider"]')).toHaveValue('0.8');
    await expect(page.locator('[data-testid="noise-suppression-toggle"]')).toBeChecked();
  });
});

test.describe('PWA Features', () => {
  test('should be installable as PWA', async ({ page }) => {
    await page.goto('/');

    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeAttached();

    // Check for service worker registration
    const swRegistration = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swRegistration).toBe(true);
  });

  test('should work offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add some data while online
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '380');
    await page.click('[data-testid="save-door-button"]');

    // Go offline
    await context.setOffline(true);

    // App should still function
    await page.reload();
    await expect(page.locator('[data-testid="door-entry-380"]')).toBeVisible();

    // Should be able to add more data offline
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '385');
    await page.click('[data-testid="save-door-button"]');
    await expect(page.locator('[data-testid="door-entry-385"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Performance & Accessibility', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    await page.goto('/');

    // Measure First Contentful Paint
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        }).observe({ entryTypes: ['paint'] });
      });
    });

    // FCP should be under 2 seconds
    expect(fcp).toBeLessThan(2000);
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="add-door-button"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="nav-shipping"]')).toBeFocused();

    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="shipping-page"]')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA landmarks
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="navigation"]')).toBeVisible();

    // Check for ARIA labels on interactive elements
    await expect(page.locator('[data-testid="add-door-button"][aria-label]')).toBeVisible();
    await expect(page.locator('[data-testid="door-number-input"][aria-label]')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be mobile responsive', async ({ page }) => {
    await page.goto('/');

    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

    // Test touch interactions
    await page.tap('[data-testid="add-door-button"]');
    await expect(page.locator('[data-testid="door-form"]')).toBeVisible();

    // Test form fills on mobile
    await page.fill('[data-testid="door-number-input"]', '345');
    await page.tap('[data-testid="save-door-button"]');
    await expect(page.locator('[data-testid="door-entry-345"]')).toBeVisible();
  });

  test('should handle touch gestures for pallets', async ({ page }) => {
    await page.goto('/pallets');

    // Test swipe gestures if implemented
    const palletCard = page.locator('[data-testid="pallet-card-332"]');
    await expect(palletCard).toBeVisible();

    // Test tap to increment
    await page.tap('[data-testid="pallet-increment-332"]');
    await expect(page.locator('[data-testid="pallet-count-332"]')).toHaveText('1');
  });
});

// API Integration Tests
test.describe('DeepSeek API Integration', () => {
  test('should analyze shipping data', async ({ page }) => {
    await page.goto('/');

    // Add some test data
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '350');
    await page.click('[data-testid="save-door-button"]');

    // Trigger analysis
    await page.click('[data-testid="analyze-button"]');

    // Should show loading state
    await expect(page.locator('[data-testid="analysis-loading"]')).toBeVisible();

    // Should eventually show results or fallback
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle API failures gracefully', async ({ page }) => {
    await page.goto('/');

    // Mock API failure
    await page.route('**/api/analyze', route => route.abort());

    // Add test data and trigger analysis
    await page.click('[data-testid="add-door-button"]');
    await page.fill('[data-testid="door-number-input"]', '350');
    await page.click('[data-testid="save-door-button"]');
    await page.click('[data-testid="analyze-button"]');

    // Should show fallback recommendations
    await expect(page.locator('[data-testid="fallback-recommendations"]')).toBeVisible();
    await expect(page.locator('text=Consider consolidating shipments')).toBeVisible();
  });
});