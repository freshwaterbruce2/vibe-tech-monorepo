import { test, expect } from '@playwright/test';

/**
 * Navigation Tests
 *
 * Comprehensive tests for site-wide navigation functionality:
 * - Desktop navigation menu
 * - Mobile navigation (hamburger menu)
 * - Page routing and URL changes
 * - Active link states
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('navigates to all main pages from desktop nav', async ({ page }) => {
    const routes = [
      { link: 'About', url: '/about' },
      { link: 'Services', url: '/services' },
      { link: 'Portfolio', url: '/portfolio' },
      { link: 'Pricing', url: '/pricing' },
      { link: 'Blog', url: '/blog' },
      { link: 'Contact', url: '/contact' },
    ];

    for (const route of routes) {
      await page.goto('/');
      await page.getByRole('link', { name: route.link }).first().click();
      await expect(page).toHaveURL(new RegExp(route.url));
    }
  });

  test('logo navigates to homepage', async ({ page }) => {
    // Navigate away first
    await page.goto('/about');

    // Click logo/brand
    await page.getByRole('link', { name: /vibe tech/i }).first().click();

    await expect(page).toHaveURL('/');
  });

  test('mobile menu opens and closes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Find and click mobile menu button
    const menuButton = page.locator('[data-testid="mobile-menu-button"]');

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Check mobile menu is visible
      const mobileMenu = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileMenu).toBeVisible();

      // Close menu
      await menuButton.click();
      await expect(mobileMenu).not.toBeVisible();
    }
  });

  test('mobile navigation links work correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const menuButton = page.locator('[data-testid="mobile-menu-button"]');

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Click a nav link in mobile menu
      await page.getByRole('link', { name: 'Services' }).click();

      await expect(page).toHaveURL(/services/);
    }
  });

  test('navigation is accessible via keyboard', async ({ page }) => {
    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check focused element is a link
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('href', /.*/);
  });

  test('404 page displays for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    // Should show 404 content
    await expect(page.getByText(/404|not found/i)).toBeVisible();
  });

  test('navigation persists scroll position on back', async ({ page }) => {
    // Scroll down on homepage
    await page.evaluate(() => window.scrollTo(0, 500));

    // Navigate to another page
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/about/);

    // Go back
    await page.goBack();

    // Check scroll position is restored
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });
});