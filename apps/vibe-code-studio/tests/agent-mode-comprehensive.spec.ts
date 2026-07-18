/**
 * Agent Mode (AIChat) — comprehensive UI suite.
 *
 * The AIChat panel opened via Ctrl+Shift+A is the primary agent surface
 * (docs/RUNTIME_DIAGNOSIS.md Wave 2). Deterministic UI behavior is tested
 * live; end-to-end task execution needs a live AI provider producing valid
 * task plans, so those flows stay skipped with the selectors the product
 * actually renders (agent-task, step-card, step-status[data-status]).
 */
import { expect, gotoAppShell, openAgentMode, test } from './fixtures/auth';

test.describe('Agent Mode - Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppShell(page);
    await openAgentMode(page);
  });

  test('shows the agent empty state against the demo workspace', async ({ page }) => {
    const emptyState = page.getByTestId('agent-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Agent mode is ready');
    await expect(emptyState).toContainText('demo://workspace');
  });

  test('switches between Chat and Agent modes', async ({ page }) => {
    await expect(page.getByTestId('mode-agent')).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('mode-chat').click();
    await expect(page.getByTestId('mode-chat')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('mode-agent')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('AI Assistant').first()).toBeVisible();

    await page.getByTestId('mode-agent').click();
    await expect(page.getByTestId('mode-agent')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Agent Mode').first()).toBeVisible();
  });

  test('shows the mode description for the active mode', async ({ page }) => {
    await expect(
      page.getByText('Let AI autonomously plan and execute complex multi-step tasks.')
    ).toBeVisible();

    await page.getByTestId('mode-chat').click();
    await expect(
      page.getByText('Have conversations with AI, ask questions, get code explanations.')
    ).toBeVisible();
  });

  test('uses an agent-specific input placeholder with a workspace open', async ({ page }) => {
    await expect(page.getByTestId('chat-input')).toHaveAttribute(
      'placeholder',
      'Describe a multi-step task for the agent...'
    );

    await page.getByTestId('mode-chat').click();
    await expect(page.getByTestId('chat-input')).toHaveAttribute(
      'placeholder',
      'Ask AI about your code...'
    );
  });

  test('exposes the clear-chat control while idle', async ({ page }) => {
    const clearChat = page.getByTestId('clear-chat');
    await expect(clearChat).toBeVisible();
    await expect(clearChat).toBeEnabled();
  });

  test.skip('displays live progress during file analysis', async ({ page }) => {
    // Requires a live/mocked AI planner producing a valid task plan.
    const input = page.getByTestId('chat-input');
    await input.fill('analyze the App.tsx file');
    await input.press('Enter');
    await expect(page.getByTestId('agent-task').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('step-status').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Task completed successfully/).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test.skip('creates a new file and opens it automatically', async ({ page }) => {
    // Requires a live/mocked AI planner + executor with write access.
    const input = page.getByTestId('chat-input');
    await input.fill('create a new file called Button.tsx with a simple React button component');
    await input.press('Enter');
    await expect(page.getByText('Button.tsx').first()).toBeVisible({ timeout: 60_000 });
  });

  test.skip('executes commands and shows output', async ({ page }) => {
    // Requires a live/mocked AI planner + executor with command access.
    const input = page.getByTestId('chat-input');
    await input.fill('run git status');
    await input.press('Enter');
    await expect(page.getByTestId('agent-task').first()).toBeVisible({ timeout: 30_000 });
  });

  test.skip('handles multi-step tasks with sequential execution', async ({ page }) => {
    // Requires a live/mocked AI planner producing a multi-step plan.
    const input = page.getByTestId('chat-input');
    await input.fill('create a LoginForm.tsx component and write a test file for it');
    await input.press('Enter');
    const steps = page.getByTestId('step-card');
    await expect(steps.first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('step-status').first()).toHaveAttribute(
      'data-status',
      'completed',
      { timeout: 60_000 }
    );
  });

  test.skip('gracefully handles command execution errors', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    const input = page.getByTestId('chat-input');
    await input.fill('run npm install nonexistent-package-xyz-123');
    await input.press('Enter');
    await expect(page.getByText(/Agent Task Failed|failed/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(input).toBeEnabled();
  });

  test.skip('updates step status in real time', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    const input = page.getByTestId('chat-input');
    await input.fill('read the package.json file');
    await input.press('Enter');
    const stepStatus = page.getByTestId('step-status').first();
    await expect(stepStatus).toHaveAttribute('data-status', /pending|in_progress/, {
      timeout: 30_000,
    });
    await expect(stepStatus).toHaveAttribute('data-status', 'completed', { timeout: 60_000 });
  });

  test.skip('maintains chat history across agent tasks', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    const input = page.getByTestId('chat-input');
    await input.fill('read vite.config.ts');
    await input.press('Enter');
    await expect(page.getByText(/Task completed successfully/).first()).toBeVisible({
      timeout: 60_000,
    });
    await input.fill('read package.json');
    await input.press('Enter');
    await expect(page.getByTestId('agent-task')).toHaveCount(2, { timeout: 60_000 });
  });

  test.skip('shows an approval prompt for destructive operations', async ({ page }) => {
    // Requires a live/mocked AI planner emitting an approval-gated step.
    const input = page.getByTestId('chat-input');
    await input.fill('delete the test-file.txt');
    await input.press('Enter');
    await expect(page.getByTestId('agent-task').first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Agent Mode - Performance Tests', () => {
  test.skip('handles large file analysis without freezing the UI', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    await gotoAppShell(page);
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    await input.fill('analyze all TypeScript files in src/components/');
    await input.press('Enter');
    await expect(input).toBeEnabled({ timeout: 5_000 });
    await expect(page.getByText(/Task completed successfully/).first()).toBeVisible({
      timeout: 120_000,
    });
  });

  test.skip('does not leak memory after 5 consecutive tasks', async ({ page }) => {
    // Requires a live/mocked AI planner + executor.
    await gotoAppShell(page);
    await openAgentMode(page);
    const input = page.getByTestId('chat-input');
    for (let i = 0; i < 5; i++) {
      await input.fill(`read src/App.tsx (iteration ${i + 1})`);
      await input.press('Enter');
      await expect(page.getByText(/Task completed successfully/).nth(i)).toBeVisible({
        timeout: 60_000,
      });
    }
  });
});
