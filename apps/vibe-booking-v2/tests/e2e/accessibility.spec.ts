import { expect, test } from '@playwright/test';

test('booking UI exposes accessible names, landmarks, and keyboard focus', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: /book work-ready hotels without second guessing the stay/i,
    }),
  ).toBeVisible();
  await expect(page.locator('form.searchForm')).toBeVisible();

  const images = await page.locator('img').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('alt') ?? ''),
  );
  expect(images.length).toBeGreaterThan(0);
  expect(images.every((alt) => alt.trim().length > 0)).toBe(true);

  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  await page.getByRole('link', { name: /terms/i }).click();
  await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
