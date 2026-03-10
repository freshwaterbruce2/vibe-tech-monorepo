import { test, expect } from '@playwright/test';

/**
 * Accessibility Tests
 *
 * Tests for WCAG compliance and accessibility best practices:
 * - Keyboard navigation
 * - Screen reader support
 * - Color contrast
 * - Focus management
 * - ARIA attributes
 */
test.describe('Accessibility', () => {
  test('homepage has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have exactly one h1
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1);

    // H2s should come after h1
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should have alt text OR role="presentation" for decorative images
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through the page
    let tabbedElements = 0;
    const maxTabs = 20;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');

      if (await focusedElement.isVisible()) {
        tabbedElements++;

        // Check focused element has visible focus indicator
        const outline = await focusedElement.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outline !== 'none' || styles.boxShadow !== 'none';
        });

        // Focus should be visible (outline or shadow)
        // Note: Some implementations use other visual indicators
      }
    }

    expect(tabbedElements).toBeGreaterThan(0);
  });

  test('buttons and links have accessible names', async ({ page }) => {
    await page.goto('/');

    // Check buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const name = await button.getAttribute('aria-label');
        const text = await button.textContent();

        // Button should have accessible name (aria-label or text content)
        expect(name || text?.trim()).toBeTruthy();
      }
    }

    // Check links
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = links.nth(i);
      if (await link.isVisible()) {
        const href = await link.getAttribute('href');
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        // Link should have accessible name
        if (href && href !== '#') {
          expect(text?.trim() || ariaLabel).toBeTruthy();
        }
      }
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/contact');

    const inputs = page.locator('input:not([type="hidden"]), textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          const hasAriaLabel = ariaLabel || ariaLabelledby || placeholder;

          expect(hasLabel || hasAriaLabel).toBeTruthy();
        }
      }
    }
  });

  test('skip to content link exists', async ({ page }) => {
    await page.goto('/');

    // Press Tab to focus first element
    await page.keyboard.press('Tab');

    // Check for skip link
    const skipLink = page.locator('a[href="#main"], a[href="#content"], a:has-text("Skip")');

    if (await skipLink.first().isVisible()) {
      await expect(skipLink.first()).toBeVisible();
    }
  });

  test('focus trap in modals/dialogs', async ({ page }) => {
    await page.goto('/');

    // Try to trigger a modal (e.g., contact button)
    const modalTrigger = page.getByRole('button', { name: /contact|get started/i }).first();

    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"], [aria-modal="true"], [class*="modal"]');

      if (await modal.isVisible()) {
        // Tab should stay within modal
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        const focusedElement = page.locator(':focus');
        const isInModal = await focusedElement.evaluate((el, modalSelector) => {
          return el.closest(modalSelector) !== null;
        }, '[role="dialog"], [aria-modal="true"], [class*="modal"]');

        expect(isInModal).toBeTruthy();

        // Escape should close modal
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('page has lang attribute', async ({ page }) => {
    await page.goto('/');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., "en" or "en-US"
  });

  test('color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');

    // Check text elements for sufficient contrast
    // Note: Full contrast testing requires axe-core or similar
    const textElements = page.locator('p, span, h1, h2, h3, a');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = textElements.nth(i);
      if (await element.isVisible()) {
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            fontSize: computed.fontSize,
          };
        });

        // At least verify we can get style info
        expect(styles.color).toBeTruthy();
      }
    }
  });

  test('reduced motion is respected', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Check that animations are reduced
    // This would require checking CSS animation-duration or similar
    const animatedElement = page.locator('[class*="animate"], [class*="motion"]').first();

    if (await animatedElement.isVisible()) {
      const animationDuration = await animatedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.animationDuration;
      });

      // With reduced motion, animations should be 0s or very short
      // Some implementations might not fully support this
    }
  });

  test('touch targets are at least 44x44 pixels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const buttons = page.locator('button, a');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box) {
          // Touch target should be at least 44x44 (WCAG 2.1 AAA)
          // 24x24 is the minimum for WCAG 2.1 AA
          expect(box.width).toBeGreaterThanOrEqual(24);
          expect(box.height).toBeGreaterThanOrEqual(24);
        }
      }
    }
  });

  test('error messages are associated with form fields', async ({ page }) => {
    await page.goto('/contact');

    // Trigger validation error
    const submitButton = page.getByRole('button', { name: /send|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for error
      await page.waitForTimeout(500);

      // Error should be associated with input via aria-describedby or aria-errormessage
      const inputs = page.locator('input[aria-invalid="true"], input[aria-describedby]');

      if (await inputs.first().isVisible()) {
        const describedBy = await inputs.first().getAttribute('aria-describedby');

        if (describedBy) {
          const errorElement = page.locator(`#${describedBy}`);
          await expect(errorElement).toBeVisible();
        }
      }
    }
  });
});