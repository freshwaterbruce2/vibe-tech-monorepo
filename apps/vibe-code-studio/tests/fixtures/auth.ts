/**
 * Shared Playwright fixtures for Vibe Code Studio E2E specs.
 *
 * The app boots to a marketing landing page unless a session exists, and the
 * session cookie is Secure/SameSite=None so it never sticks on
 * http://localhost:3001. Every spec therefore mocks GET /api/auth/me before
 * navigation so AppLayout mounts the real editor shell.
 *
 * In web mode (plain browser, no Tauri/Electron globals) the app auto-opens
 * the demo workspace (demo://workspace) with index.js in Monaco.
 */
import { test as base, expect, type Page } from '@playwright/test';

export const MOCK_USER = {
  ok: true,
  configured: true,
  user: {
    id: 'e2e-1',
    email: 'e2e@vibe.studio',
    fullName: 'E2E User',
    plan: 'pro',
  },
} as const;

/** Extended test that auto-installs the auth mock on every page. */
export const test = base.extend<{ mockAuth: void }>({
  mockAuth: [
    async ({ page }, use) => {
      await page.route('**/api/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_USER),
        });
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Navigate to '/' and wait for the authenticated app shell to mount.
 * The first load on a cold Vite dev server can take well over 30s while the
 * module graph is transformed, so the shell wait is generous.
 */
export async function gotoAppShell(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForSelector('.loading-screen', { state: 'detached', timeout: 60_000 })
    .catch(() => undefined);
  await expect(page.locator('[data-testid="app-container"]')).toBeVisible({ timeout: 60_000 });
}

/** Wait for the web-mode demo workspace to open a file in Monaco. */
export async function waitForDemoEditor(page: Page): Promise<void> {
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 });
}

/**
 * Open the AIChat panel in Agent mode via Ctrl+Shift+A and wait for it.
 * (The AIChat root does not render a data-testid, so we anchor on chat-input.)
 */
export async function openAgentMode(page: Page): Promise<void> {
  await page.keyboard.press('Control+Shift+A');
  await expect(page.getByTestId('chat-input')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('mode-agent')).toHaveAttribute('aria-pressed', 'true');
}

/**
 * Fulfill AI proxy chat completions (http://localhost:5004/api/ai/...) with a
 * fixed assistant message, so AI-backed UI flows run without a live provider.
 */
export async function mockAiCompletion(page: Page, content: string): Promise<void> {
  await page.route('**/api/ai/**', async route => {
    const url = route.request().url();
    if (!url.includes('/chat/completions')) {
      // /health etc. — report unreachable so the client keeps default routing.
      await route.abort('connectionrefused');
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: `e2e-${Date.now()}`,
        model: 'e2e-mock',
        choices: [{ message: { content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
  });
}

/** Make every AI proxy completion call fail fast with a 500. */
export async function mockAiFailure(page: Page): Promise<void> {
  await page.route('**/api/ai/**', async route => {
    const url = route.request().url();
    if (!url.includes('/chat/completions')) {
      await route.abort('connectionrefused');
      return;
    }
    await route.fulfill({ status: 500, contentType: 'text/plain', body: 'e2e mock failure' });
  });
}
