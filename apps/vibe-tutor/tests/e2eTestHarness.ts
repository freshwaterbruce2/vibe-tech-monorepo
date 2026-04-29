import { expect, type Page, type Route } from '@playwright/test';

export const BASE_URL = 'http://localhost:5173';

export const SEEDED_HOMEWORK_TITLE = 'Playwright Algebra Packet';
export const SEEDED_COMPLETED_HOMEWORK_TITLE = 'Completed Science Review';

const todayIsoDate = (offsetDays = 0): string => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const seededHomeworkItems = () => [
  {
    id: 'pw-homework-active',
    subject: 'Math',
    title: SEEDED_HOMEWORK_TITLE,
    dueDate: todayIsoDate(1),
    completed: false,
  },
  {
    id: 'pw-homework-completed',
    subject: 'Science',
    title: SEEDED_COMPLETED_HOMEWORK_TITLE,
    dueDate: todayIsoDate(-1),
    completed: true,
    completedDate: Date.now() - 60 * 60 * 1000,
  },
];

const seededTokenTransactions = () => [
  {
    id: 'pw-token-welcome',
    type: 'earn',
    amount: 150,
    reason: 'Playwright setup balance',
    timestamp: Date.now() - 60 * 60 * 1000,
  },
  {
    id: 'pw-token-homework',
    type: 'earn',
    amount: 25,
    reason: 'Seeded homework completion',
    timestamp: Date.now() - 30 * 60 * 1000,
  },
];

const yesterdayWellnessDate = (): string => todayIsoDate(-1);

export async function seedCompletedOnboarding(page: Page): Promise<void> {
  await page.addInitScript(
    ({ homeworkItems, tokenTransactions, yesterday }) => {
      if (sessionStorage.getItem('__vibetutor_e2e_seeded') === 'true') {
        return;
      }

      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('__vibetutor_e2e_seeded', 'true');

      const tokenBalance = 250;
      const now = Date.now();

      const entries: Record<string, string> = {
        onboarding_completed: 'true',
        user_avatar: 'test-avatar',
        user_type: 'kid',
        has_visited_shop: 'true',
        onboarding_checklist_done: 'true',
        homeworkItems: JSON.stringify(homeworkItems),
        userTokens: String(tokenBalance),
        user_tokens: String(tokenBalance),
        vibetutor_token_state_v2: JSON.stringify({
          version: 2,
          balance: tokenBalance,
          totalEarned: 300,
          totalSpent: 50,
          updatedAt: now,
        }),
        vibetutor_token_transactions_v2: JSON.stringify(tokenTransactions),
        vibetutor_token_migrated_v2: 'true',
        'chat-history-tutor': JSON.stringify([
          {
            role: 'model',
            content: 'Seeded tutor history',
            timestamp: now - 120000,
          },
        ]),
        'chat-history-friend': JSON.stringify([
          {
            role: 'model',
            content: 'Seeded buddy history',
            timestamp: now - 120000,
          },
        ]),
        daily_affirmations: JSON.stringify([
          {
            date: yesterday,
            morningAffirmation: {
              id: 'test-affirmation',
              category: 'capability',
              text: 'I can handle one step at a time.',
            },
            mood: 'good',
            eveningReflection: 'Seeded reflection',
            timestamp: now - 24 * 60 * 60 * 1000,
          },
        ]),
        cbt_thought_journal: JSON.stringify([
          {
            id: 'thought-seeded',
            situation: 'Before a test',
            automaticThought: 'I always mess up tests',
            emotion: 'worried',
            emotionIntensity: 6,
            identifiedPattern: 'all-or-nothing',
            challengingQuestions: ['What evidence do I have for this thought?'],
            reframedThought: null,
            newEmotion: null,
            newEmotionIntensity: null,
            timestamp: now - 24 * 60 * 60 * 1000,
          },
        ]),
        vibe_schedules_data: JSON.stringify({
          items: [
            {
              id: 'schedule-seeded',
              time: '08:00',
              meridian: 'AM',
              activity: 'Morning reading',
              type: 'daytime',
            },
          ],
          chores: [
            {
              id: 'chore-seeded',
              task: 'Organize desk',
              completed: false,
              rewardTokens: 10,
            },
          ],
          goals: [
            {
              id: 'goal-seeded',
              title: 'Finish science notes',
              type: 'short-term',
              completed: false,
            },
          ],
        }),
        parentRewards: JSON.stringify([
          {
            id: 'reward-seeded',
            name: 'Extra game time',
            cost: 50,
            pointsRequired: 50,
            description: 'A seeded reward for parent dashboard checks.',
          },
        ]),
        claimedRewards: JSON.stringify([]),
        'vibe-splitpane-left': '35',
      };

      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
    },
    {
      homeworkItems: seededHomeworkItems(),
      tokenTransactions: seededTokenTransactions(),
      yesterday: yesterdayWellnessDate(),
    },
  );
}

export async function mockAiEndpoints(page: Page): Promise<void> {
  const fulfillChat = async (route: Route) => {
    const body = (route.request().postData() ?? '').toLowerCase();
    const content = body.includes('hello buddy')
      ? 'Mock buddy response'
      : 'Mock tutor response';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content } }],
      }),
    });
  };

  await page.route('**/api/session/init', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'test-token', expiresIn: 3600 }),
    });
  });

  await page.route('**/api/chat', fulfillChat);
  await page.route('**/api/openrouter/chat', fulfillChat);

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy' }),
    });
  });
}

export async function prepareVibeTutorTestPage(page: Page): Promise<void> {
  await seedCompletedOnboarding(page);
  await mockAiEndpoints(page);
}

export async function openDashboard(page: Page): Promise<void> {
  await page.goto(BASE_URL);
  await expect(page.getByRole('heading', { name: 'Homework Dashboard' }).first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: /^Add$/ }).first()).toBeVisible();
}
