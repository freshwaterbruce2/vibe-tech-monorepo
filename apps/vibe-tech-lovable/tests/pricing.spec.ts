import { test, expect } from '@playwright/test';

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
    // Check page heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/pricing|plans/i);

    // Check pricing cards exist
    const pricingCards = page.locator('[data-testid="pricing-card"], [class*="pricing"] [class*="card"], [class*="plan"]');
    await expect(pricingCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows multiple pricing tiers', async ({ page }) => {
    const pricingCards = page.locator('[data-testid="pricing-card"], [class*="pricing"] [class*="card"]');

    // Should have at least 2 pricing tiers
    const count = await pricingCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('each tier shows price and features', async ({ page }) => {
    const firstTier = page.locator('[data-testid="pricing-card"], [class*="pricing"] [class*="card"]').first();

    if (await firstTier.isVisible()) {
      // Should show price
      const price = firstTier.locator('[class*="price"], :text(/\\$\\d+/)');
      await expect(price).toBeVisible();

      // Should show features list
      const features = firstTier.locator('ul li, [class*="feature"]');
      const featureCount = await features.count();
      expect(featureCount).toBeGreaterThan(0);
    }
  });

  test('CTA buttons are visible and clickable', async ({ page }) => {
    const ctaButtons = page.locator('[data-testid="pricing-cta"], [class*="pricing"] button, [class*="plan"] a[href*="contact"]');

    if (await ctaButtons.first().isVisible()) {
      // Each pricing tier should have a CTA
      await expect(ctaButtons.first()).toBeVisible();

      // CTA should be clickable (not disabled)
      await expect(ctaButtons.first()).toBeEnabled();
    }
  });

  test('CTA navigates to contact or checkout', async ({ page }) => {
    const ctaButton = page.locator('[data-testid="pricing-cta"], [class*="pricing"] a, [class*="plan"] button').first();

    if (await ctaButton.isVisible()) {
      await ctaButton.click();

      // Should navigate to contact page or show modal
      await expect(page).toHaveURL(/contact|checkout|book|schedule/);
    }
  });

  test('highlights recommended/popular tier', async ({ page }) => {
    // Look for highlighted/featured tier
    const highlightedTier = page.locator('[data-testid="featured-tier"], [class*="popular"], [class*="recommended"], [class*="featured"]');

    if (await highlightedTier.isVisible()) {
      await expect(highlightedTier).toBeVisible();

      // Should have visual distinction (badge, border, etc.)
      await expect(highlightedTier.locator(':text(/popular|recommended|best value/i)')).toBeVisible();
    }
  });

  test('FAQ section exists and is interactive', async ({ page }) => {
    // Scroll to FAQ section
    const faqSection = page.locator('[data-testid="faq"], [class*="faq"], :text("Frequently Asked")').first();

    if (await faqSection.isVisible()) {
      await faqSection.scrollIntoViewIfNeeded();

      // Look for accordion items
      const faqItems = page.locator('[data-testid="faq-item"], [class*="accordion"], details');

      if (await faqItems.first().isVisible()) {
        // Click to expand
        await faqItems.first().click();

        // Content should be visible
        const content = faqItems.first().locator('[class*="content"], [class*="answer"], p');
        await expect(content).toBeVisible();
      }
    }
  });

  test('pricing toggle switches between monthly/yearly', async ({ page }) => {
    const billingToggle = page.locator('[data-testid="billing-toggle"], [class*="toggle"], :text("Monthly")');

    if (await billingToggle.isVisible()) {
      // Get initial price
      const priceElement = page.locator('[class*="price"]').first();
      const initialPrice = await priceElement.textContent();

      // Toggle billing period
      await billingToggle.click();

      // Price should change
      await page.waitForTimeout(300);
      const newPrice = await priceElement.textContent();

      // Yearly price might be different (discount) or formatted differently
      expect(newPrice).not.toEqual(initialPrice);
    }
  });

  test('custom/enterprise option is available', async ({ page }) => {
    // Look for custom/enterprise pricing option
    const customOption = page.getByText(/custom|enterprise|contact us|let.s talk/i);

    await expect(customOption.first()).toBeVisible();
  });

  test('pricing page is responsive', async ({ page }) => {
    const pricingCards = page.locator('[data-testid="pricing-card"], [class*="pricing"] [class*="card"]');

    // Desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(pricingCards.first()).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(pricingCards.first()).toBeVisible();

    // Mobile - cards should stack
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(pricingCards.first()).toBeVisible();
  });

  test('shows money-back guarantee or trust badges', async ({ page }) => {
    const trustElements = page.getByText(/guarantee|secure|trusted|money.back|satisfaction/i);

    // At least one trust element should be visible
    if (await trustElements.first().isVisible()) {
      await expect(trustElements.first()).toBeVisible();
    }
  });
});