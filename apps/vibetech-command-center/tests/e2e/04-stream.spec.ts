import { test, expect } from '@playwright/test';
import { launchApp, closeApp, waitForStreamLive, type AppFixture } from './fixture';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let fixture: AppFixture;

test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

interface ProbeWindow {
  __ccWatcherProbe?: Promise<{ appName: string; type: string }>;
}

test('file changes in V:\\monorepo\\apps cause watcher events to reach renderer', async () => {
  const { page } = fixture;

  await expect(page.locator('text=/Apps \\(\\d+\\)/')).toBeVisible({ timeout: 15_000 });
  await waitForStreamLive(page);

  const probeDir = 'V:\\monorepo\\apps\\vibetech-command-center\\src\\__e2e_probe__';
  const probeFile = join(probeDir, `probe-${Date.now()}.ts`);

  if (!existsSync(probeDir)) mkdirSync(probeDir, { recursive: true });

  // Arm the listener and wait for the evaluate to resolve — this guarantees the
  // subscription is registered in the renderer BEFORE we mutate the filesystem,
  // removing the previous fixed 200ms sleep (which could drop the event on a slow run).
  await page.evaluate(() => {
    const w = window as unknown as ProbeWindow;
    w.__ccWatcherProbe = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no event in 5s')), 5_000);
      const unsub = window.commandCenter.stream.subscribe('cc.watcher.events', (payload) => {
        const events = payload as Array<{ appName: string | null; type: string }>;
        const match = events.find((e) => e.appName === 'vibetech-command-center');
        if (match) {
          clearTimeout(timer);
          unsub();
          resolve({ appName: match.appName as string, type: match.type });
        }
      });
    });
  });

  writeFileSync(probeFile, '// e2e probe');

  const event = await page.evaluate(() => {
    const w = window as unknown as ProbeWindow;
    return w.__ccWatcherProbe!;
  });

  expect(event.appName).toBe('vibetech-command-center');
  expect(['add', 'change', 'addDir', 'unlinkDir']).toContain(event.type);

  rmSync(probeDir, { recursive: true, force: true });
});
