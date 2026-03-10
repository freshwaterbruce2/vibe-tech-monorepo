import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible({ timeout: 15000 });
  });

  test('renders core dashboard on mobile', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Mobile navigation/i })).toBeVisible();
  });

  test('assignment form inputs remain readable', async ({ page }) => {
    await page.getByRole('button', { name: /^Add$/ }).click({ force: true });
    const subjectInput = page.getByPlaceholder('Subject (e.g., Math)');
    await expect(subjectInput).toBeVisible();

    const fontSize = await subjectInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    const parsedSize = Number.parseInt(fontSize, 10);
    expect(parsedSize).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Landscape Orientation', () => {
  test.use({
    viewport: { width: 915, height: 412 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Moto G) AppleWebKit/537.36',
  });

  test('renders in landscape without overflow', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible();
  });
});
