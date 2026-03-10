import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('AI Chat Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/session/init', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-token', expiresIn: 3600 }),
      });
    });

    await page.route('**/api/chat', async (route) => {
      const body = route.request().postData() ?? '';
      const isBuddy = /buddy|friend/i.test(body);
      const mockText = isBuddy ? 'Mock buddy response' : 'Mock tutor response';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: mockText } }],
        }),
      });
    });

    await page.goto(BASE_URL);
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible({ timeout: 15000 });
  });

  test('tutor chat sends and receives', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: /Vibe Tutor|AI Tutor/i })).toBeVisible();

    const input = board.getByLabel('Chat input');
    await input.fill('Hello tutor');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('Hello tutor')).toBeVisible();
    await expect(board.getByText('Mock tutor response')).toBeVisible({ timeout: 15000 });
  });

  test('buddy chat sends and receives', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Buddy|AI Buddy|Buddy/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: /Vibe Buddy|AI Buddy/i })).toBeVisible();

    const input = board.getByLabel('Chat input');
    await input.fill('Hello buddy');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('Hello buddy')).toBeVisible();
    await expect(board.getByText('Mock buddy response')).toBeVisible({ timeout: 15000 });
  });

  test('chat history persists per session', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = page.getByLabel('Evidence board');

    const input = board.getByLabel('Chat input');
    await input.fill('Message one');
    await board.getByRole('button', { name: /Send message/i }).click();
    await expect(board.getByText('Message one')).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    await expect(page.getByLabel('Evidence board').getByText('Message one')).toBeVisible({
      timeout: 10000,
    });
  });
});
