import { test, expect } from '@playwright/test';

/**
 * Visual regression coverage for the Nova Agent dashboard.
 *
 * Why: the Jan 31 regression (POST-MORTEM-2026-01-31.md) broke the dashboard
 * grid only at md/lg breakpoints because responsive CSS utilities used invalid
 * double-escaped selectors. Base styles still worked, so unit tests passed.
 * These tests assert layout at mobile, md, and lg so the same class of bug
 * cannot ship silently again.
 *
 * Run locally:
 *   pnpm --filter nova-agent test:visual
 * Update baselines after an intentional layout change:
 *   pnpm --filter nova-agent test:visual:update
 */

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'md', width: 768, height: 900 },
  { name: 'lg', width: 1280, height: 900 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`dashboard layout at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    // Wait for the main landmark before snapshotting so we never capture
    // an empty root while React is still mounting.
    await page.waitForSelector('main, [role="main"], #root > *', {
      state: 'visible',
      timeout: 15_000,
    });

    // Freeze caret blink + any css transitions before the screenshot.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
      fullPage: true,
    });
  });
}

test('responsive utility classes actually apply at lg (regression guard)', async ({
  page,
}) => {
  // Direct guard against the Jan 31 bug class: if the .lg\:grid-cols-4
  // selector is broken again, the computed style will not match.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  // Inject a probe element so this test works even if the dashboard layout
  // markup changes. We verify the CSS rule itself resolves.
  const columns = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'grid lg:grid-cols-4';
    probe.setAttribute('data-testid', 'visual-probe');
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    document.body.appendChild(probe);
    const computed = getComputedStyle(probe).gridTemplateColumns;
    probe.remove();
    return computed;
  });

  // At >=1024px viewport, `lg:grid-cols-4` must resolve to 4 track sizes.
  const trackCount = columns.trim().split(/\s+/).length;
  expect(
    trackCount,
    `lg:grid-cols-4 should resolve to 4 columns at 1280px viewport, got: "${columns}"`,
  ).toBe(4);
});
