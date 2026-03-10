import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function mockAiEndpoints(page: Page): Promise<void> {
  await page.route('**/api/session/init', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'test-token', expiresIn: 3600 }),
    });
  });

  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: 'Mock AI response from Playwright' } }],
      }),
    });
  });

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy' }),
    });
  });
}

async function openDashboard(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible({ timeout: 15000 });
}

test.describe('Vibe-Tutor Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAiEndpoints(page);
    await openDashboard(page);
  });

  test('loads dashboard', async ({ page }) => {
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: 'Homework Dashboard' })).toBeVisible();
    await expect(board.getByRole('button', { name: /^Add$/ })).toBeVisible();
  });

  test('navigates to Vibe Tutor', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: /Vibe Tutor|AI Tutor/i })).toBeVisible();
    await expect(board.getByLabel('Chat input')).toBeVisible();
  });

  test('sends message in tutor chat', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = page.getByLabel('Evidence board');
    const input = board.getByLabel('Chat input');
    await input.fill('What is 2 + 2?');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('What is 2 + 2?')).toBeVisible();
    await expect(board.getByText('Mock AI response from Playwright')).toBeVisible({ timeout: 15000 });
  });

  test('navigates to Vibe Buddy', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Buddy|AI Buddy|Buddy/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.locator('h1:visible', { hasText: /Vibe Buddy|AI Buddy/i })).toBeVisible();
    await expect(board.getByLabel('Chat input')).toBeVisible();
  });

  test('opens focus timer', async ({ page }) => {
    await page.getByRole('button', { name: /Focus/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.getByRole('heading', { name: /Focus Time|Break Time/i })).toBeVisible();
    await expect(board.locator('text=/\\d{2}:\\d{2}/')).toBeVisible();
    await board.getByRole('button', { name: /Start timer|Pause timer/i }).click();
  });

  test('opens sensory settings', async ({ page }) => {
    await page.getByRole('button', { name: /Sensory/i }).first().click();
    const board = page.getByLabel('Evidence board');
    await expect(board.getByRole('heading', { name: /Sensory Settings/i })).toBeVisible();
    await expect(board.getByText(/Movement & Animations/i)).toBeVisible();
  });

  test('adds a homework item', async ({ page }) => {
    const board = page.getByLabel('Evidence board');
    await board.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByRole('heading', { name: /New Assignment/i })).toBeVisible();

    await page.getByPlaceholder('Subject (e.g., Math)').fill('Math');
    await page.getByPlaceholder('Title (e.g., Complete worksheet)').fill('Test Assignment');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateString ?? '');

    await page.getByRole('button', { name: /Add Assignment/i }).click();
    await expect(board.getByRole('heading', { name: 'Test Assignment' })).toBeVisible({
      timeout: 10000,
    });
  });
});
