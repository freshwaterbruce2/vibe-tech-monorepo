import { expect, test } from '@playwright/test';
import { openDashboard, prepareVibeTutorTestPage } from './e2eTestHarness';

test.describe('AI Chat Integration', () => {
  test.beforeEach(async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
  });

  test('tutor chat sends, receives, and persists', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: /Vibe Tutor|AI Tutor/i })).toBeVisible();

    const input = board.getByLabel('Chat input');
    await input.fill('Hello tutor');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('Hello tutor')).toBeVisible();
    await expect(board.getByText('Mock tutor response')).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('chat-history-tutor') ?? ''))
      .toContain('Hello tutor');

    await page.reload();
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    await expect(page.getByLabel('Evidence board').getByText('Hello tutor')).toBeVisible({
      timeout: 10000,
    });
  });

  test('buddy chat sends, receives, and persists independently', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Buddy|AI Buddy|Buddy/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: /Vibe Buddy|AI Buddy/i })).toBeVisible();

    const input = board.getByLabel('Chat input');
    await input.fill('Hello buddy');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('Hello buddy')).toBeVisible();
    await expect(board.getByText('Mock buddy response')).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('chat-history-friend') ?? ''))
      .toContain('Hello buddy');
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('chat-history-tutor') ?? ''))
      .not.toContain('Hello buddy');
  });
});
