import { test, expect } from '@playwright/test';

test('persists browser-safe settings through the web UI', async ({ page }) => {
  await page.goto('/');

  const sidebar = page.locator('nav').locator('..');
  await sidebar.hover();
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(page.getByRole('heading', { name: 'System Configuration' })).toBeVisible();
  await expect(page.getByTestId('connection-status')).toContainText('http://localhost:8000');

  const ollamaUrl = 'http://127.0.0.1:11434';
  await page.getByLabel('Local Inference URL (Ollama)').fill(ollamaUrl);
  await page.getByRole('button', { name: 'Save Configuration' }).click();

  await expect(page.getByRole('heading', { name: 'System Configuration' })).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('vibe_ollama_url')))
    .toBe(ollamaUrl);
});
