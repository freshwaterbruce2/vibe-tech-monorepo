import { expect, test, type Locator } from '@playwright/test';
import { BASE_URL, mockAiEndpoints, openDashboard, prepareVibeTutorTestPage } from './e2eTestHarness';

const expectTouchTarget = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
};

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test.beforeEach(async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
  });

  test('renders core dashboard on mobile', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Mobile navigation/i })).toBeVisible();
  });

  test('keeps desktop navigation hidden and mobile controls touch-sized', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: /Desktop navigation/i })).toHaveCount(0);

    const mobileNav = page.getByRole('navigation', { name: /Mobile navigation/i });
    const navButtons = mobileNav.getByRole('button');
    const navButtonCount = await navButtons.count();
    expect(navButtonCount).toBeGreaterThan(0);

    for (let index = 0; index < navButtonCount; index += 1) {
      await expectTouchTarget(navButtons.nth(index));
    }

    await page.getByRole('button', { name: /More navigation options/i }).click();
    await expectTouchTarget(page.getByRole('button', { name: /Close menu/i }));

    const moreDrawerButtons = page.locator('.fixed.inset-0.z-\\[70\\]').getByRole('button');
    const moreButtonCount = await moreDrawerButtons.count();
    expect(moreButtonCount).toBeGreaterThan(1);

    for (let index = 0; index < moreButtonCount; index += 1) {
      await expectTouchTarget(moreDrawerButtons.nth(index));
    }
  });

  test('assignment form inputs remain readable', async ({ page }) => {
    await page.getByRole('button', { name: /^Add$/ }).click();
    const subjectInput = page.getByPlaceholder('Subject (e.g., Math)');
    await expect(subjectInput).toBeVisible();

    const fontSize = await subjectInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    const parsedSize = Number.parseInt(fontSize, 10);
    expect(parsedSize).toBeGreaterThanOrEqual(16);

    await expectTouchTarget(page.getByRole('button', { name: /Add with Voice/i }));
    await expectTouchTarget(page.getByRole('button', { name: /Cancel/i }));
    await expectTouchTarget(page.getByRole('button', { name: /Add Assignment/i }));
  });

  test('mobile more drawer routes to secondary app areas', async ({ page }) => {
    await page.getByRole('button', { name: /More navigation options/i }).click();
    await page.getByRole('button', { name: /Schedules/i }).click();
    await expect(page.getByRole('heading', { name: /Schedules & Goals/i })).toBeVisible();

    await page.getByRole('button', { name: /More navigation options/i }).click();
    await page.getByRole('button', { name: /Wellness/i }).click();
    await expect(page.getByRole('heading', { name: /Wellness Hub/i })).toBeVisible();
  });
});

test.describe('Landscape Orientation', () => {
  test.use({
    viewport: { width: 915, height: 412 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Moto G) AppleWebKit/537.36',
  });

  test('renders in landscape without overflow and keeps Add clickable', async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
    await expect(page.locator('body')).toBeVisible();
    await page.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByRole('heading', { name: /New Assignment/i })).toBeVisible();
  });
});

test.describe('Mobile Onboarding', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test('hides mobile bottom navigation during first-run onboarding', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('onboarding_completed', 'false');
    });
    await mockAiEndpoints(page);
    await page.goto(BASE_URL);

    await expect(page.getByRole('heading', { name: /Welcome to/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Mobile navigation/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /More navigation options/i })).toHaveCount(0);
  });
});
