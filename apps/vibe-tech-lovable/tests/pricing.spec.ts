import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

/**
 * Pricing Page Tests
 *
 * Tests for the pricing page functionality:
 * - Pricing tier display
 * - Feature comparison
 * - CTA buttons
 * - FAQ section
 */
test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('displays pricing page with tiers', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/pricing/i);
    await expect(page.getByRole('heading', { name: /^starter$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^professional$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^enterprise$/i })).toBeVisible();
  });

  test('shows multiple pricing tiers', async ({ page }) => {
    const tierHeadings = page.getByRole('heading').filter({
      hasText: /^(Starter|Professional|Enterprise)$/,
    });
    const count = await tierHeadings.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('each tier shows price and features', async ({ page }) => {
    const starterTier = page.locator('[class*="glass-card"]').filter({
      has: page.getByRole('heading', { name: /^starter$/i }),
    });

    await expect(starterTier).toBeVisible();
    await expect(starterTier.getByText(/\$\d+/)).toBeVisible();

    const features = starterTier.locator('ul li');
    expect(await features.count()).toBeGreaterThan(0);
  });

  test('CTA buttons are visible and clickable', async ({ page }) => {
    const ctaButtons = page.locator('[class*="glass-card"] button');
    await expect(ctaButtons.first()).toBeVisible();
    await expect(ctaButtons.first()).toBeEnabled();
    expect(await ctaButtons.count()).toBeGreaterThanOrEqual(3);
  });

  test('CTA interactions are clickable without navigation errors', async ({ page }) => {
    const starterTier = page.locator('[class*="glass-card"]').filter({
      has: page.getByRole('heading', { name: /^starter$/i }),
    });
    await starterTier.getByRole('button').click();
    await expect(page).toHaveURL(/\/pricing$/);
  });

  test('highlights recommended/popular tier', async ({ page }) => {
    const highlightedTier = page.locator('[class*="glass-card"]').filter({
      has: page.getByRole('heading', { name: /^professional$/i }),
    });

    await expect(highlightedTier).toBeVisible();
    await expect(highlightedTier.getByText(/most popular/i)).toBeVisible();
  });

  test('FAQ section exists and is interactive', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /frequently asked questions/i })).toBeVisible();

    const firstQuestion = page.getByRole('button', { name: /how do your prices compare to freelancers/i });
    await firstQuestion.click();
    await expect(
      page.getByText(/subscription model provides consistent, professional service/i),
    ).toBeVisible();
  });

  test('pricing toggle switches between monthly/yearly', async ({ page }) => {
    const starterTier = page.locator('[class*="glass-card"]').filter({
      has: page.getByRole('heading', { name: /^starter$/i }),
    });

    await expect(starterTier.getByText('$29')).toBeVisible();

    await page.getByRole('button', { name: /switch to yearly billing/i }).click();
    await expect(starterTier.getByText('$24')).toBeVisible();
  });

  test('custom/enterprise option is available', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^enterprise$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /need a custom solution/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /contact sales team/i })).toBeVisible();
  });

  test('pricing page is responsive', async ({ page }) => {
    const starterTier = page.locator('[class*="glass-card"]').filter({
      has: page.getByRole('heading', { name: /^starter$/i }),
    });

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(starterTier).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(starterTier).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(starterTier).toBeVisible();
  });

  test('shows money-back guarantee or trust badges', async ({ page }) => {
    await expect(page.getByText(/satisfaction guarantee/i)).toBeVisible();
    await expect(page.getByText(/customer support/i)).toBeVisible();
    await expect(page.getByText(/risk-free trial/i)).toBeVisible();
  });
});

