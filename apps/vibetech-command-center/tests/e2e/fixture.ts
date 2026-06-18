import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { join } from 'node:path';

export interface AppFixture {
  app: ElectronApplication;
  page: Page;
}

export async function launchApp(): Promise<AppFixture> {
  const root = join(__dirname, '..', '..');
  const app = await electron.launch({
    args: [join(root, 'out', 'main', 'index.js')],
    cwd: root,
    timeout: 30_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_DISABLE_DEVTOOLS: '1'
    }
  });

  const page = await app.firstWindow({ timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');

  // Real readiness instead of a fixed sleep: wait until the preload bridge is actually
  // exposed on window. This fails closed (throws on timeout) rather than racing a blind
  // delay that can pass before the renderer has wired up.
  await page.waitForFunction(
    () => typeof window.commandCenter?.stream?.subscribe === 'function',
    undefined,
    { timeout: 15_000 }
  );

  return { app, page };
}

/**
 * Resolve once the live WebSocket stream is actually connected, using the app's own
 * "stream live" indicator as the readiness signal. Call before exercising any stream
 * topic so subscriptions attach to an already-open socket and no events are dropped.
 */
export async function waitForStreamLive(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.locator('text=stream live').waitFor({ state: 'visible', timeout: timeoutMs });
}

export async function closeApp(fixture: AppFixture): Promise<void> {
  try { await fixture.app.close(); } catch { /* already closed */ }
}
