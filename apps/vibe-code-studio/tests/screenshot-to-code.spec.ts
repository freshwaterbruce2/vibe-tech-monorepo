/**
 * Screenshot-to-Code panel smoke: open via StatusBar and assert upload UI.
 * Auth is mocked by the shared fixture (see tests/fixtures/auth.ts).
 *
 * Uses the shared 120s suite timeout (do not lower it): cold Vite + parallel
 * workers can spend most of a minute transforming the app shell.
 */
import { expect, gotoAppShell, test } from './fixtures/auth';

test.describe('Screenshot to Code panel', () => {
  test('opens panel from status bar toggle', async ({ page }) => {
    await gotoAppShell(page);

    // Prefer test id; fall back to accessible name if prop forwarding is delayed.
    const toggle = page
      .getByTestId('status-screenshot-toggle')
      .or(page.getByRole('button', { name: /^Screenshot$/i }));
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await toggle.click();

    const panel = page.getByTestId('screenshot-to-code-panel');
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('screenshot-upload-zone')).toBeVisible();
    await expect(page.getByText(/Drop an image here or click to browse/i)).toBeVisible();

    // Desktop proof artifact (D:\ per workspace policy)
    await page.screenshot({
      path: 'D:/screenshots/vcs-screenshot-panel-open.png',
      fullPage: true,
    });

    // Toggle off via status bar (close button can be under overlays in headed mode)
    await toggle.click();
    await expect(panel).toBeHidden({ timeout: 15_000 });
  });
});
