import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let fixture: AppFixture;

test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('file changes in C:\\dev\\apps cause watcher events to reach renderer', async () => {
  const { page } = fixture;

  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('text=stream live')).toBeVisible({ timeout: 10_000 });

  const probeDir = 'C:\\dev\\apps\\vibetech-command-center\\src\\__e2e_probe__';
  const probeFile = join(probeDir, `probe-${Date.now()}.ts`);

  if (!existsSync(probeDir)) mkdirSync(probeDir, { recursive: true });

  const eventPromise = page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no event in 5s')), 5_000);
    const unsub = window.commandCenter.stream.subscribe('cc.watcher.events', (payload) => {
      const events = payload as Array<{ appName: string | null; type: string }>;
      const match = events.find((e) => e.appName === 'vibetech-command-center');
      if (match) {
        clearTimeout(timer);
        unsub();
        resolve(match);
      }
    });
  }));

  await page.waitForTimeout(200);
  writeFileSync(probeFile, '// e2e probe');

  const event = await eventPromise as { appName: string; type: string };
  expect(event.appName).toBe('vibetech-command-center');
  expect(['add', 'change', 'addDir', 'unlinkDir']).toContain(event.type);

  rmSync(probeDir, { recursive: true, force: true });
});
