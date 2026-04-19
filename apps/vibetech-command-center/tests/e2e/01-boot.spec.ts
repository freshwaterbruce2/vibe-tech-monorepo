import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';

let fixture: AppFixture;
test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('boots and renders Command Center title', async () => {
  const { page } = fixture;
  await expect(page.locator('text=COMMAND CENTER')).toBeVisible({ timeout: 10_000 });
});

test('sidebar shows all 7 nav items enabled', async () => {
  const { page } = fixture;
  await expect(page.getByRole('button', { name: /Apps/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Databases/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Backups/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Builds/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /RAG Search/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Claude/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Agents/ })).toBeVisible();
});

test('default panel is Apps and shows app cards within 15s', async () => {
  const { page } = fixture;
  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });
});

test('stream connection indicator turns green within 8s', async () => {
  const { page } = fixture;
  await expect(page.locator('text=stream live')).toBeVisible({ timeout: 8_000 });
});
