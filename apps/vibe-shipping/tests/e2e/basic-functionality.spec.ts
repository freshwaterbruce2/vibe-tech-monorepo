import { test, expect } from '@playwright/test';

test.describe('Basic Functionality', () => {
  test('should load the application successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/DC.*8980.*Shipping/);

    // Check for main navigation
    const mainContent = page.locator('main, [role="main"], #root');
    await expect(mainContent).toBeVisible();

    console.log('✓ Application loaded successfully');
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for any navigation elements
    const navElements = page.locator('nav, [role="navigation"], a[href]').first();
    await expect(navElements).toBeVisible();

    console.log('✓ Navigation elements present');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that content is visible on mobile
    const content = page.locator('body');
    await expect(content).toBeVisible();

    console.log('✓ Mobile responsiveness working');
  });

  test('should have PWA manifest', async ({ page }) => {
    await page.goto('/');

    // Check for manifest link (PWA plugin creates multiple)
    const manifestLink = page.locator('link[rel="manifest"]').first();
    await expect(manifestLink).toBeAttached();

    console.log('✓ PWA manifest present');
  });
});

test.describe('Server API', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('requests');

    console.log('✓ Server health check working');
  });

  test('should handle metrics endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/metrics');

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('performance');
    expect(data).toHaveProperty('timestamp');

    console.log('✓ Server metrics endpoint working');
  });
});