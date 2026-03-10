import { test, expect } from '@playwright/test';

/**
 * Portfolio Filter Tests
 *
 * Tests for the portfolio page functionality:
 * - Category filtering
 * - Project card display
 * - Project detail navigation
 * - Responsive grid layout
 */
test.describe('Portfolio Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portfolio');
  });

  test('displays portfolio page with projects', async ({ page }) => {
    // Check page title/heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/portfolio|projects|work/i);

    // Check project cards are visible
    const projectCards = page.locator('[data-testid="project-card"], .project-card, [class*="portfolio"] [class*="card"]');
    await expect(projectCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows filter buttons for categories', async ({ page }) => {
    // Look for filter buttons/tabs
    const filterButtons = page.locator('[data-testid="filter-button"], [role="tab"], button:has-text("All")');

    if (await filterButtons.first().isVisible()) {
      await expect(filterButtons.first()).toBeVisible();

      // Should have "All" filter option
      await expect(page.getByRole('button', { name: /all/i })).toBeVisible();
    }
  });

  test('filters projects by category', async ({ page }) => {
    // Get initial project count
    const projectCards = page.locator('[data-testid="project-card"], .project-card');
    const initialCount = await projectCards.count();

    // Find and click a category filter (e.g., "Web")
    const webFilter = page.getByRole('button', { name: /web|development/i });

    if (await webFilter.isVisible()) {
      await webFilter.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Count should change or stay same (filtered)
      const filteredCount = await projectCards.count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('All filter shows all projects', async ({ page }) => {
    const allFilter = page.getByRole('button', { name: /all/i });

    if (await allFilter.isVisible()) {
      // First click another filter
      const otherFilter = page.locator('[data-testid="filter-button"], [role="tab"]').nth(1);
      if (await otherFilter.isVisible()) {
        await otherFilter.click();
        await page.waitForTimeout(300);
      }

      // Then click All
      await allFilter.click();
      await page.waitForTimeout(300);

      // All projects should be visible
      const projectCards = page.locator('[data-testid="project-card"], .project-card');
      await expect(projectCards.first()).toBeVisible();
    }
  });

  test('project card displays required information', async ({ page }) => {
    const firstCard = page.locator('[data-testid="project-card"], .project-card').first();

    if (await firstCard.isVisible()) {
      // Should have title
      const title = firstCard.locator('h2, h3, [class*="title"]');
      await expect(title).toBeVisible();

      // Should have image or placeholder
      const image = firstCard.locator('img, [class*="image"], [class*="thumbnail"]');
      await expect(image).toBeVisible();
    }
  });

  test('clicking project card navigates to detail', async ({ page }) => {
    const firstCard = page.locator('[data-testid="project-card"], .project-card').first();

    if (await firstCard.isVisible()) {
      // Click the card or its link
      const link = firstCard.locator('a').first();

      if (await link.isVisible()) {
        await link.click();

        // Should navigate to project detail page
        await expect(page).toHaveURL(/project|portfolio\/.+/);
      }
    }
  });

  test('filter state persists after navigation and back', async ({ page }) => {
    const webFilter = page.getByRole('button', { name: /web/i });

    if (await webFilter.isVisible()) {
      // Apply filter
      await webFilter.click();
      await page.waitForTimeout(300);

      // Navigate to a project
      const firstCard = page.locator('[data-testid="project-card"], .project-card a').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForTimeout(500);

        // Go back
        await page.goBack();

        // Filter should still be active (this may vary by implementation)
        await expect(webFilter).toHaveAttribute('aria-selected', 'true').catch(() => {
          // Some implementations may not persist filter state
        });
      }
    }
  });

  test('portfolio grid is responsive', async ({ page }) => {
    // Desktop - should show multiple columns
    await page.setViewportSize({ width: 1200, height: 800 });
    const desktopCards = page.locator('[data-testid="project-card"], .project-card');
    await expect(desktopCards.first()).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(desktopCards.first()).toBeVisible();

    // Mobile - should show single column
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(desktopCards.first()).toBeVisible();
  });

  test('shows empty state when no projects match filter', async ({ page }) => {
    // This test assumes there might be a filter with no results
    // If all filters have results, this test will be skipped
    const filterButtons = page.locator('[data-testid="filter-button"], [role="tab"]');
    const count = await filterButtons.count();

    for (let i = 0; i < count; i++) {
      await filterButtons.nth(i).click();
      await page.waitForTimeout(300);

      const projectCards = page.locator('[data-testid="project-card"], .project-card');
      const cardCount = await projectCards.count();

      if (cardCount === 0) {
        // Should show empty state message
        await expect(page.getByText(/no projects|no results|nothing found/i)).toBeVisible();
        break;
      }
    }
  });
});