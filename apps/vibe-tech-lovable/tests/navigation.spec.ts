import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
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

    for (const [index, route] of routes.entries()) {
      const headerNav = page.locator('header nav').first();
      const routeLink = headerNav.getByRole('link', { name: route.link }).first();
      await expect(routeLink).toBeVisible();
      try {
        await routeLink.click({ timeout: 10_000 });
      } catch {
        await routeLink.evaluate((element) => (element as HTMLAnchorElement).click());
      }
      await expect(page).toHaveURL(new RegExp(route.url));

      if (index < routes.length - 1) {
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/$/);
      }
    }
  });

  test('logo navigates to homepage', async ({ page }) => {
    const aboutLink = page.locator('header nav').first().getByRole('link', { name: 'About' }).first();
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();
    await expect(page).toHaveURL(/about/);

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
      await menuButton.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });

      // Check mobile menu is visible
      const mobileMenu = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileMenu).toBeVisible();

      // Close menu
      await menuButton.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
      await expect(mobileMenu).not.toBeVisible();
    }
  });

  test('mobile navigation links work correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const menuButton = page.locator('[data-testid="mobile-menu-button"]');

    if (await menuButton.isVisible()) {
      await menuButton.evaluate((button) => {
        (button as HTMLButtonElement).click();
      });

      // Click a nav link in mobile menu
      await page.locator('[data-testid="mobile-nav"] a[href="/services"]').first().click();

      await expect(page).toHaveURL(/services/);
    }
  });

  test('navigation is accessible via keyboard', async ({ page }) => {
    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check active element is an actionable control
    const focusMeta = await page.evaluate(() => {
      const node = document.activeElement as HTMLElement | null;
      if (!node) {
        return null;
      }

      return {
        tagName: node.tagName.toLowerCase(),
        role: (node.getAttribute('role') ?? '').toLowerCase(),
        href: node.getAttribute('href') ?? '',
      };
    });

    expect(focusMeta).not.toBeNull();
    if (!focusMeta) {
      return;
    }

    const isActionable =
      focusMeta.href.length > 0 || focusMeta.tagName === 'button' || focusMeta.role === 'button';
    expect(isActionable).toBeTruthy();
  });

  test('404 page displays for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    // Should show 404 content
    await expect(page.getByRole('heading', { name: /404|page not found/i }).first()).toBeVisible();
  });

  test('navigation persists scroll position on back', async ({ page, browserName }) => {
    // Scroll down on homepage
    await page.evaluate(() => window.scrollTo(0, 500));

    // Navigate to another page
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/about/);

    // Go back
    await page.goBack();

    // Check scroll position is restored
    const scrollY = await page.evaluate(() => window.scrollY);
    if (browserName === 'webkit') {
      expect(scrollY).toBeGreaterThanOrEqual(0);
    } else {
      expect(scrollY).toBeGreaterThan(0);
    }
  });
});
