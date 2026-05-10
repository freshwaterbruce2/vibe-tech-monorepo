import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

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
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/portfolio|projects|work/i);

    const projectLinks = page.locator('a[href^="/portfolio/project-"]');
    await expect(projectLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows filter buttons for categories', async ({ page }) => {
    const filterButtons = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: /^all$/i }) })
      .first()
      .getByRole('button');

    await expect(filterButtons.first()).toBeVisible();
    expect(await filterButtons.count()).toBeGreaterThan(1);
    await expect(filterButtons.filter({ hasText: /^all$/i })).toHaveCount(1);
  });

  test('filters projects by category', async ({ page }) => {
    const projectLinks = page.locator('a[href^="/portfolio/project-"]');
    const initialCount = await projectLinks.count();

    const filterButtons = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: /^all$/i }) })
      .first()
      .getByRole('button');
    expect(await filterButtons.count()).toBeGreaterThan(1);

    const firstCategory = filterButtons.nth(1);
    await firstCategory.click();

    await expect(projectLinks.first()).toBeVisible();
    const filteredCount = await projectLinks.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('All filter shows all projects', async ({ page }) => {
    const projectLinks = page.locator('a[href^="/portfolio/project-"]');
    const allProjectsCount = await projectLinks.count();

    const filterButtons = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: /^all$/i }) })
      .first()
      .getByRole('button');

    expect(await filterButtons.count()).toBeGreaterThan(1);

    await filterButtons.nth(1).click();
    await expect(projectLinks.first()).toBeVisible();

    await filterButtons.filter({ hasText: /^all$/i }).click();
    await expect(projectLinks.first()).toBeVisible();
    await expect(projectLinks).toHaveCount(allProjectsCount);
  });

  test('project card displays required information', async ({ page }) => {
    const firstProject = page.locator('a[href^="/portfolio/project-"]').first();

    await expect(firstProject).toBeVisible();
    await expect(firstProject.getByRole('heading')).toBeVisible();
    await expect(firstProject.locator('img')).toBeVisible();
  });

  test('clicking project card navigates to detail', async ({ page }) => {
    const firstProject = page.locator('a[href^="/portfolio/project-"]').first();
    await firstProject.click();
    await expect(page).toHaveURL(/\/portfolio\/project-/);
  });

  test('can navigate to project detail and return to portfolio', async ({ page }) => {
    const filterButtons = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: /^all$/i }) })
      .first()
      .getByRole('button');

    expect(await filterButtons.count()).toBeGreaterThan(1);
    await filterButtons.nth(1).click();

    const firstProject = page.locator('a[href^="/portfolio/project-"]').first();
    await firstProject.click();
    await expect(page).toHaveURL(/\/portfolio\/project-/);

    await page.goBack();
    await expect(page).toHaveURL(/\/portfolio$/);
    await expect(page.locator('a[href^="/portfolio/project-"]').first()).toBeVisible();
  });

  test('portfolio grid is responsive', async ({ page }) => {
    const projectLinks = page.locator('a[href^="/portfolio/project-"]');

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(projectLinks.first()).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(projectLinks.first()).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(projectLinks.first()).toBeVisible();
  });

  test('shows empty state when no projects match filter', async ({ page }) => {
    const filterButtons = page
      .locator('section')
      .filter({ has: page.getByRole('button', { name: /^all$/i }) })
      .first()
      .getByRole('button');
    const projectLinks = page.locator('a[href^="/portfolio/project-"]');

    let emptyStateSeen = false;

    for (let index = 0; index < (await filterButtons.count()); index += 1) {
      await filterButtons.nth(index).click();
      const cardCount = await projectLinks.count();
      if (cardCount === 0) {
        await expect(page.getByText(/no projects found matching the selected filter/i)).toBeVisible();
        emptyStateSeen = true;
        break;
      }
    }

    if (!emptyStateSeen) {
      await expect(projectLinks.first()).toBeVisible();
    }
  });
});

