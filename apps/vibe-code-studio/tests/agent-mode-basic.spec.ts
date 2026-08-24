/**
 * Agent Mode (AIChat) — basic functionality.
 *
 * Deterministic UI coverage runs live. Task-execution flows need a live AI
 * provider behind the proxy plus a deterministic task-plan response, so they
 * stay skipped (same policy as the multi-file approval suite awaiting an
 * AI-trigger mechanism — see tests/README.md).
 */
import { expect, gotoAppShell, openAgentMode, test } from './fixtures/auth';

test.describe('Agent Mode - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppShell(page);
  });

  test('opens Agent Mode with Ctrl+Shift+A', async ({ page }) => {
    await openAgentMode(page);
    await expect(page.getByText('Agent Mode').first()).toBeVisible();
    await expect(page.getByTestId('agent-empty-state')).toBeVisible();
  });

  test('chat input accepts text and stays editable', async ({ page }) => {
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('read the package.json file');
    await expect(input).toHaveValue('read the package.json file');
    await expect(input).toBeEditable();
  });

  test('closes the AI chat panel with the close button', async ({ page }) => {
    await openAgentMode(page);
    await page.getByRole('button', { name: 'Close AI Chat' }).click();
    await expect(page.getByTestId('chat-input')).toBeHidden();
  });

  test.skip('executes a simple file read task', async ({ page }) => {
    // Requires a live/mocked AI planner producing a valid task plan.
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('read the package.json file');
    await input.press('Enter');
    await expect(page.getByTestId('agent-task').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Task completed successfully/).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test.skip('displays task steps during execution', async ({ page }) => {
    // Requires a live/mocked AI planner producing a valid task plan.
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('analyze the vite.config.ts file');
    await input.press('Enter');
    await expect(page.getByTestId('step-card').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('step-status').first()).toBeVisible();
  });

  test.skip('shows the agent task report after analysis', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('review the App.tsx file');
    await input.press('Enter');
    await expect(page.getByText(/Agent Task/).first()).toBeVisible({ timeout: 60_000 });
  });

  test.skip('handles a file creation request', async ({ page }) => {
    // Requires a live/mocked AI planner + executor with write access.
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('create a file called TestComponent.tsx with a simple React component');
    await input.press('Enter');
    await expect(page.getByText('TestComponent.tsx').first()).toBeVisible({ timeout: 60_000 });
  });

  test.skip('does not freeze the UI during a long-running task', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('analyze all files in src/components/');
    await input.press('Enter');
    await expect(page.getByTestId('agent-task').first()).toBeVisible({ timeout: 30_000 });
  });
});
