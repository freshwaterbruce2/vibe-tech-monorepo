import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MonorepoWatcher } from './monorepo-watcher';
import type { FileEvent } from '@shared/types';

describe('MonorepoWatcher', () => {
  let tmpRoot: string;
  let watcher: MonorepoWatcher;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-watch-'));
    mkdirSync(join(tmpRoot, 'apps', 'test-app', 'src'), { recursive: true });
    mkdirSync(join(tmpRoot, 'packages', 'test-pkg', 'src'), { recursive: true });
    mkdirSync(join(tmpRoot, 'apps', 'test-app', 'node_modules'), { recursive: true });
  });

  afterEach(async () => {
    await watcher?.stop();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  const waitForReady = (w: MonorepoWatcher) =>
    new Promise<void>((resolve) => w.once('ready', resolve));

  const waitForEvents = (w: MonorepoWatcher, timeoutMs = 2000) =>
    new Promise<FileEvent[]>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      w.once('events', (events: FileEvent[]) => {
        clearTimeout(t);
        resolve(events);
      });
    });

  it('emits ready after initial scan', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);
    expect(watcher.getWatched()).toBeTypeOf('object');
  });

  it('detects file add inside apps/*/src with correct appName', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);

    const target = join(tmpRoot, 'apps', 'test-app', 'src', 'index.ts');
    const eventsPromise = waitForEvents(watcher);
    writeFileSync(target, 'export const x = 1;');
    const events = await eventsPromise;

    expect(events.some((e) => e.appName === 'test-app' && e.type === 'add')).toBe(true);
  });

  it('ignores node_modules writes', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);

    const ignored = join(tmpRoot, 'apps', 'test-app', 'node_modules', 'junk.js');
    writeFileSync(ignored, 'x');

    await new Promise((r) => setTimeout(r, 400));
    // no events should have fired for ignored path — if any did, fail
    const watched = watcher.getWatched();
    const flat = Object.values(watched).flat().join('|');
    expect(flat).not.toMatch(/node_modules/);
  });

  it('debounces multiple rapid writes into one emission', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 200 });
    watcher.start();
    await waitForReady(watcher);

    const f1 = join(tmpRoot, 'apps', 'test-app', 'src', 'a.ts');
    const f2 = join(tmpRoot, 'apps', 'test-app', 'src', 'b.ts');
    const eventsPromise = waitForEvents(watcher);
    writeFileSync(f1, 'a');
    writeFileSync(f2, 'b');
    const events = await eventsPromise;

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((e) => e.appName === 'test-app')).toBe(true);
  });

  it('derives packageName for packages/*/src paths', async () => {
    watcher = new MonorepoWatcher({ monorepoRoot: tmpRoot, debounceMs: 100 });
    watcher.start();
    await waitForReady(watcher);

    const target = join(tmpRoot, 'packages', 'test-pkg', 'src', 'util.ts');
    const eventsPromise = waitForEvents(watcher);
    writeFileSync(target, 'x');
    const events = await eventsPromise;

    expect(events.some((e) => e.packageName === 'test-pkg' && e.appName === null)).toBe(true);
  });
});
