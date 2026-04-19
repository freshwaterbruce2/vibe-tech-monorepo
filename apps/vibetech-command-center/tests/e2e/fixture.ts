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
  await page.waitForTimeout(500);
  return { app, page };
}

export async function closeApp(fixture: AppFixture): Promise<void> {
  try { await fixture.app.close(); } catch { /* already closed */ }
}
