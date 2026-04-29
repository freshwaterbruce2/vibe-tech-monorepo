import { expect, test, type Page } from '@playwright/test';
import {
  BASE_URL,
  SEEDED_HOMEWORK_TITLE,
  mockAiEndpoints,
  openDashboard,
  prepareVibeTutorTestPage,
  seedCompletedOnboarding,
} from './e2eTestHarness';

const visibleAppSurface = async (page: Page) => {
  const evidenceBoard = page.getByLabel('Evidence board');
  return (await evidenceBoard.count()) > 0 ? evidenceBoard : page.locator('main');
};

test.describe('Vibe-Tutor Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
  });

  test('loads the seeded dashboard instead of first-run onboarding', async ({ page }) => {
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: 'Homework Dashboard' })).toBeVisible();
    await expect(board.getByRole('heading', { name: SEEDED_HOMEWORK_TITLE })).toBeVisible();
    await expect(page.getByText('Welcome to Vibe-Tutor')).toHaveCount(0);
  });

  test('clicks dashboard hit targets for notifications, AI help, and completion', async ({
    page,
  }) => {
    const board = await visibleAppSurface(page);

    await board.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Upcoming Deadlines')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: SEEDED_HOMEWORK_TITLE }),
    ).toBeVisible();

    await board.getByRole('button', { name: 'AI Help' }).first().click();
    await expect(page.getByRole('heading', { name: 'Task Breakdown' })).toBeVisible();
    await page.getByRole('button', { name: 'Close task breakdown' }).click();

    await board.getByRole('button', { name: 'Complete' }).first().click();
    await expect(board.getByRole('button', { name: 'Done' }).first()).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('vibetutor_token_transactions_v2') ?? ''),
      )
      .toContain('Homework completed');
  });

  test('adds a homework item and persists it locally', async ({ page }) => {
    const board = await visibleAppSurface(page);
    await board.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByRole('heading', { name: /New Assignment/i })).toBeVisible();

    await page.getByPlaceholder('Subject (e.g., Math)').fill('Math');
    await page.getByPlaceholder('Title (e.g., Complete worksheet)').fill('Test Assignment');

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateString ?? '');

    await page.getByRole('button', { name: /Add Assignment/i }).click();
    await expect(board.getByRole('heading', { name: 'Test Assignment' })).toBeVisible({
      timeout: 10000,
    });
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('homeworkItems') ?? ''))
      .toContain('Test Assignment');
  });

  test('opens the tutor route from desktop navigation', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.locator('h1:visible', { hasText: /Vibe Tutor|AI Tutor/i })).toBeVisible();
    await expect(board.getByLabel('Chat input')).toBeVisible();
  });

  test('sends a tutor chat message through the test API route', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Tutor|AI Tutor|Tutor/i }).first().click();
    const board = await visibleAppSurface(page);
    const input = board.getByLabel('Chat input');
    await input.fill('What is 2 + 2?');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('What is 2 + 2?')).toBeVisible();
    await expect(board.getByText('Mock tutor response')).toBeVisible({ timeout: 15000 });
  });

  test('opens and sends a Vibe Buddy message', async ({ page }) => {
    await page.getByRole('button', { name: /Vibe Buddy|AI Buddy|Buddy/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.locator('h1:visible', { hasText: /Vibe Buddy|AI Buddy/i })).toBeVisible();

    const input = board.getByLabel('Chat input');
    await input.fill('Hello buddy');
    await board.getByRole('button', { name: /Send message/i }).click();

    await expect(board.getByText('Hello buddy')).toBeVisible();
    await expect(board.getByText('Mock buddy response')).toBeVisible({ timeout: 15000 });
  });

  test('opens schedules and preserves seeded schedule data', async ({ page }) => {
    await page.getByRole('button', { name: /Schedules/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: /Schedules & Goals/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(board.getByText('Morning reading')).toBeVisible({ timeout: 15000 });
  });

  test('opens focus timer', async ({ page }) => {
    await page.getByRole('button', { name: /Focus/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: /Focus Time|Break Time/i })).toBeVisible();
    await expect(board.locator('text=/\\d{2}:\\d{2}/')).toBeVisible();
    await board.getByRole('button', { name: /Start timer|Pause timer/i }).click();
  });

  test('opens sensory settings', async ({ page }) => {
    await page.getByRole('button', { name: /Sensory/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: /Sensory Settings/i })).toBeVisible();
    await expect(board.getByRole('heading', { name: /Animation Speed/i })).toBeVisible();
  });

  test('opens token wallet and reward shop', async ({ page }) => {
    await page.getByRole('button', { name: /^Tokens$/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: /Token Wallet/i })).toBeVisible();
    await expect(board.getByText('Current Balance')).toBeVisible();

    await board.getByRole('button', { name: /Shop/i }).first().click();
    await expect(board.getByRole('heading', { name: /Vibebux Reward Shop/i })).toBeVisible();
  });

  test('opens reward shop directly from navigation', async ({ page }) => {
    await page.getByRole('button', { name: /Reward Shop/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: /Vibebux Reward Shop/i })).toBeVisible();
    await expect(board.getByText(/Your Balance/i)).toBeVisible();
  });

  test('opens parent navigation without blocking the app shell', async ({ page }) => {
    await page.getByRole('button', { name: /Parent Zone/i }).first().click();
    const board = await visibleAppSurface(page);
    await expect(board.getByRole('heading', { name: /Set Up Parent PIN|Parent Zone/i })).toBeVisible();
  });

  test('saves wellness check-in and thought journal entries locally', async ({ page }) => {
    await page.getByRole('button', { name: /Wellness/i }).first().click();
    const board = await visibleAppSurface(page);

    await expect(board.getByRole('heading', { name: /Wellness Hub/i })).toBeVisible({
      timeout: 15000,
    });
    await board.getByRole('button', { name: /Great/ }).click();
    await board.getByLabel('Reflection (optional)').fill('Playwright wellness reflection');
    await board.getByRole('button', { name: /Save check-in/i }).click();
    await expect(board.getByRole('button', { name: /Saved today/i })).toBeVisible();

    await board.getByRole('button', { name: /Add thought entry/i }).click();
    await board.getByLabel('Situation').fill('A hard quiz is coming up');
    await board.getByLabel('Automatic thought').fill('I always mess up quizzes');
    await board.getByLabel('Emotion').fill('anxious');
    await board.getByRole('button', { name: /Save entry/i }).click();
    await expect(board.getByText('I always mess up quizzes')).toBeVisible();

    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('daily_affirmations') ?? ''))
      .toContain('Playwright wellness reflection');
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('cbt_thought_journal') ?? ''))
      .toContain('I always mess up quizzes');
  });
});

test.describe('Vibe-Tutor first-run gate', () => {
  test('still shows onboarding when completed state is absent', async ({ page }) => {
    await mockAiEndpoints(page);
    await page.goto(BASE_URL);
    await expect(page.getByRole('heading', { name: 'Welcome to Vibe-Tutor' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('uses seeded completed-onboarding state before app initialization', async ({ page }) => {
    await seedCompletedOnboarding(page);
    await mockAiEndpoints(page);
    await openDashboard(page);
  });
});
