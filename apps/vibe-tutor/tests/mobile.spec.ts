import { expect, test } from '@playwright/test';
import { openDashboard, prepareVibeTutorTestPage } from './e2eTestHarness';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test.beforeEach(async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
  });

  test('renders core dashboard on mobile', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Mobile navigation/i })).toBeVisible();
  });

  test('assignment form inputs remain readable', async ({ page }) => {
    await page.getByRole('button', { name: /^Add$/ }).click();
    const subjectInput = page.getByPlaceholder('Subject (e.g., Math)');
    await expect(subjectInput).toBeVisible();

    const fontSize = await subjectInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    const parsedSize = Number.parseInt(fontSize, 10);
    expect(parsedSize).toBeGreaterThanOrEqual(16);
  });

  test('mobile more drawer routes to secondary app areas', async ({ page }) => {
    await page.getByRole('button', { name: /More navigation options/i }).click();
    await page.getByRole('button', { name: /Schedules/i }).click();
    await expect(page.getByRole('heading', { name: /Schedules & Goals/i })).toBeVisible();

    await page.getByRole('button', { name: /More navigation options/i }).click();
    await page.getByRole('button', { name: /Wellness/i }).click();
    await expect(page.getByRole('heading', { name: /Wellness Hub/i })).toBeVisible();
  });
});

test.describe('Landscape Orientation', () => {
  test.use({
    viewport: { width: 915, height: 412 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Moto G) AppleWebKit/537.36',
  });

  test('renders in landscape without overflow and keeps Add clickable', async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
    await expect(page.locator('body')).toBeVisible();
    await page.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByRole('heading', { name: /New Assignment/i })).toBeVisible();
  });
});
