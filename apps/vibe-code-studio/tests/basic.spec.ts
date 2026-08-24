/**
 * Basic E2E smoke tests for Vibe Code Studio (web mode).
 * Auth is mocked by the shared fixture; web mode auto-opens the demo
 * workspace (demo://workspace) with index.js in Monaco.
 */
import { expect, gotoAppShell, test, waitForDemoEditor } from './fixtures/auth';

test.describe('Vibe Code Studio - Basic Functionality', () => {
  test('loads the application with the expected title', async ({ page }) => {
    await gotoAppShell(page);
    await expect(page).toHaveTitle(/Vibe Code Studio/);
  });

  test('mounts the app shell behind the auth gate', async ({ page }) => {
    await gotoAppShell(page);
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
  });

  test('auto-opens the demo workspace with index.js in the editor', async ({ page }) => {
    await gotoAppShell(page);
    await waitForDemoEditor(page);
    await expect(page.getByText('index.js').first()).toBeVisible({ timeout: 15_000 });
  });

  test('status bar exposes the panel toggles', async ({ page }) => {
    await gotoAppShell(page);
    await expect(page.getByTestId('status-chat-agent-toggle')).toBeVisible();
    await expect(page.getByTestId('status-terminal-toggle')).toBeVisible();
    await expect(page.getByTestId('status-sidebar-toggle')).toBeVisible();
    await expect(page.getByTestId('status-screenshot-toggle')).toBeVisible();
  });

  test('opens the AI chat panel from the Chat Agent toggle', async ({ page }) => {
    await gotoAppShell(page);
    await page.getByTestId('status-chat-agent-toggle').click();
    await expect(page.getByTestId('chat-input')).toBeVisible({ timeout: 15_000 });
  });
});
