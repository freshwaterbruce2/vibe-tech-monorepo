/**
 * E2E tests for Ctrl+K inline editing (InlineEditWidget).
 *
 * AI responses are mocked at the backend AI proxy boundary
 * (http://localhost:5004/api/ai/... — see fixtures/auth.ts), so generation
 * flows run deterministically without a live provider.
 *
 * Note: the Ctrl+K binding uses react-hotkeys-hook without enableOnFormTags,
 * so it does not fire while Monaco's hidden textarea has focus. Tests blur
 * the editor before pressing Ctrl+K (see openInlineEdit).
 */
import type { Page } from '@playwright/test';
import {
  expect,
  gotoAppShell,
  mockAiCompletion,
  mockAiFailure,
  test,
  waitForDemoEditor,
} from './fixtures/auth';

const MOCK_EDIT = 'const mockedInlineEdit = 42;';

/** Click into Monaco, select the demo file content, then open Ctrl+K. */
async function openInlineEdit(page: Page, selectAll = true): Promise<void> {
  await waitForDemoEditor(page);
  await page.locator('.monaco-editor .view-lines').first().click();
  if (selectAll) {
    await page.keyboard.press('Control+A');
  }
  // Blur Monaco's hidden textarea so the app-level hotkey receives Ctrl+K.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Control+K');
  await expect(page.getByTestId('inline-edit-dialog')).toBeVisible({ timeout: 5_000 });
}

test.describe('Cmd+K Inline Editing', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppShell(page);
  });

  test('opens the inline edit dialog with Ctrl+K', async ({ page }) => {
    await openInlineEdit(page);
    await expect(page.getByTestId('instruction-input')).toBeVisible();
    await expect(page.getByTestId('instruction-input')).toBeFocused();
  });

  test('opens at the cursor even without a selection (current behavior)', async ({ page }) => {
    await openInlineEdit(page, false);
    await expect(page.getByTestId('instruction-input')).toBeVisible();
  });

  test('generates an edit and shows the diff with accept/reject actions', async ({ page }) => {
    await mockAiCompletion(page, MOCK_EDIT);
    await openInlineEdit(page);

    await page.getByTestId('instruction-input').fill('add error handling');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('diff-view')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('accept-button')).toBeVisible();
    await expect(page.getByTestId('reject-button')).toBeVisible();
  });

  test('accepting the edit applies it to the editor', async ({ page }) => {
    await mockAiCompletion(page, MOCK_EDIT);
    await openInlineEdit(page);

    await page.getByTestId('instruction-input').fill('replace everything with the mock');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('accept-button')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('accept-button').click();
    await expect(page.getByTestId('inline-edit-dialog')).toBeHidden();
    await expect(page.getByText('mockedInlineEdit').first()).toBeVisible({ timeout: 10_000 });
  });

  test('rejecting the edit closes the dialog without applying', async ({ page }) => {
    await mockAiCompletion(page, MOCK_EDIT);
    await openInlineEdit(page);

    await page.getByTestId('instruction-input').fill('do a thing');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('reject-button')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('reject-button').click();
    await expect(page.getByTestId('inline-edit-dialog')).toBeHidden();
    await expect(page.getByText('mockedInlineEdit')).toHaveCount(0);
  });

  test('shows an error state with retry when the AI request fails', async ({ page }) => {
    await mockAiFailure(page);
    await openInlineEdit(page);

    await page.getByTestId('instruction-input').fill('add comments');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('retry-button')).toBeVisible();
    await expect(page.getByTestId('inline-edit-dialog')).toBeVisible();
  });

  test('closes the dialog when Escape is pressed', async ({ page }) => {
    await openInlineEdit(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inline-edit-dialog')).toBeHidden();
  });

  test('handles rapid Ctrl+K presses with a single dialog', async ({ page }) => {
    await waitForDemoEditor(page);
    await page.locator('.monaco-editor .view-lines').first().click();
    await page.keyboard.press('Control+A');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+K');
      await page.waitForTimeout(100);
    }

    await expect(page.getByTestId('inline-edit-dialog')).toHaveCount(1);
  });

  test('editor remains usable after closing the dialog', async ({ page }) => {
    await openInlineEdit(page);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inline-edit-dialog')).toBeHidden();

    await page.locator('.monaco-editor .view-lines').first().click();
    await page.keyboard.press('Control+A');
    const content = await page.locator('.monaco-editor .view-lines').first().textContent();
    expect(content?.length).toBeGreaterThan(0);
  });

  test('empty instruction does not start a generation', async ({ page }) => {
    await openInlineEdit(page);
    await page.keyboard.press('Enter');

    // No generation starts: dialog stays open in the input state.
    await expect(page.getByTestId('inline-edit-dialog')).toBeVisible();
    await expect(page.getByTestId('diff-view')).toHaveCount(0);
    await expect(page.getByTestId('error-message')).toHaveCount(0);
  });
});
