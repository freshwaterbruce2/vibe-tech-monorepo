import { expect, test } from '@playwright/test';

test('generated SaaS app renders and reaches the protected Fastify route', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Operator account', { exact: true })).toBeVisible();

  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('change-this-password');
  await page.getByRole('button', { name: /sign in for pro access/i }).click();

  await expect(page.getByText(/session active/i)).toBeVisible();
  await page.getByRole('button', { name: /check protected pro route/i }).click();
  await expect(page.getByText(/protected route is live/i)).toBeVisible();
  
  // Assert CME Tracker components are rendered
  await expect(page.getByText('CME Progress Tracker')).toBeVisible();
  await expect(page.locator('.eyebrow', { hasText: 'Log CME Activity' })).toBeVisible();
});
