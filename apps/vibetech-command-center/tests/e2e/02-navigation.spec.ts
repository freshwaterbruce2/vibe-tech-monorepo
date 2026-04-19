import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';

let fixture: AppFixture;
test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('switching panels updates header and content', async () => {
  const { page } = fixture;
  await page.getByRole('button', { name: /Databases/ }).click();
  await expect(page.locator('text=/Databases \\(\\d+\\)/')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Backups/ }).click();
  await expect(page.locator('text=/Recent Backups/')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Builds/ }).click();
  await expect(page.locator('text=/Build Status/')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Agents/ }).click();
  await expect(page.locator('text=/Processes/')).toBeVisible({ timeout: 10_000 });
});
