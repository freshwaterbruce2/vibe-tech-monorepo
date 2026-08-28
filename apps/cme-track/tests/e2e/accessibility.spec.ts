import { expect, test } from '@playwright/test';

test('core pages expose accessible landmarks and names', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /terms/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /privacy/i })).toBeVisible();

  const images = await page
    .locator('img')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('alt') ?? ''));
  expect(images.every((alt) => alt.trim().length > 0)).toBe(true);

  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
