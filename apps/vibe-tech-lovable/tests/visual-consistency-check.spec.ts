import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8082';

const screenshotOptions = {
  fullPage: false,
  animations: 'disabled' as const,
};

test.describe('Visual Consistency Analysis', () => {
  test('Compare Services page design with other pages', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await page.screenshot({
      ...screenshotOptions,
      path: 'tests/screenshots/about-page-desktop.png',
    });

    await page.goto(`${BASE_URL}/portfolio`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await page.screenshot({
      ...screenshotOptions,
      path: 'tests/screenshots/portfolio-page-desktop.png',
    });

    await page.goto(`${BASE_URL}/services`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await page.screenshot({
      ...screenshotOptions,
      path: 'tests/screenshots/services-page-desktop.png',
    });

    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/about`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await page.screenshot({
      ...screenshotOptions,
      path: 'tests/screenshots/about-page-mobile.png',
    });

    const aboutHeaderStyles = await page.locator('h1').first().evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        textAlign: styles.textAlign,
      };
    });

    const aboutSections = await page.locator('section').count();
    expect(aboutSections).toBeGreaterThan(0);

    await page.goto(`${BASE_URL}/services`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    await page.screenshot({
      ...screenshotOptions,
      path: 'tests/screenshots/services-page-mobile.png',
    });

    const servicesHeaderStyles = await page.locator('h1').first().evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        textAlign: styles.textAlign,
      };
    });

    expect(servicesHeaderStyles.textAlign).toBe(aboutHeaderStyles.textAlign);
    expect(servicesHeaderStyles.fontWeight).toBe(aboutHeaderStyles.fontWeight);
    expect(servicesHeaderStyles.fontSize).toBe(aboutHeaderStyles.fontSize);
  });

  test('Check for design pattern inconsistencies', async ({ page }) => {
    await page.goto(`${BASE_URL}/services`, { waitUntil: 'domcontentloaded' });

    const pageHeader = await page.locator('.gradient-text-full, .neon-text-glow').count();
    expect(pageHeader).toBeGreaterThan(0);

    const sectionPadding = await page.evaluate(() => {
      const sections = document.querySelectorAll('section');
      const paddingStyles: Array<{
        section: number;
        paddingTop: string;
        paddingBottom: string;
        paddingLeft: string;
        paddingRight: string;
      }> = [];

      sections.forEach((section, index) => {
        const styles = window.getComputedStyle(section);
        paddingStyles.push({
          section: index,
          paddingTop: styles.paddingTop,
          paddingBottom: styles.paddingBottom,
          paddingLeft: styles.paddingLeft,
          paddingRight: styles.paddingRight,
        });
      });

      return paddingStyles;
    });

    expect(sectionPadding.length).toBeGreaterThan(0);

    const containerWidths = await page.evaluate(() => {
      const containers = document.querySelectorAll('.max-w-6xl, .max-w-7xl, .max-w-4xl, .max-w-5xl');
      const widths: Array<{ container: number; maxWidth: string; className: string }> = [];

      containers.forEach((container, index) => {
        const styles = window.getComputedStyle(container);
        widths.push({
          container: index,
          maxWidth: styles.maxWidth,
          className: container.className,
        });
      });

      return widths;
    });

    expect(containerWidths.length).toBeGreaterThan(0);
    const uniqueMaxWidths = new Set(containerWidths.map((entry) => entry.maxWidth));
    expect(uniqueMaxWidths.size).toBeLessThanOrEqual(4);
  });
});
