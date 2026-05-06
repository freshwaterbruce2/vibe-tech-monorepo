import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';

let fixture: AppFixture;
test.beforeEach(async () => { fixture = await launchApp(); });
test.afterEach(async () => { await closeApp(fixture); });

test('meta.info returns expected shape', async () => {
  const { page } = fixture;
  const result = await page.evaluate(() => window.commandCenter.meta.info());
  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: { version: string; monorepoRoot: string; wsPort: number } }).data;
  expect(data.version).toBeTruthy();
  expect(data.monorepoRoot).toBe('C:\\dev');
  expect(data.wsPort).toBeGreaterThan(0);
});

test('health.probeAll returns array of 6 services', async () => {
  const { page } = fixture;
  const result = await page.evaluate(() => window.commandCenter.health.probeAll());
  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: unknown[] }).data;
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBe(6);
});

test('nx.get returns project graph with both apps and libs', async () => {
  test.setTimeout(90_000);
  const { page } = fixture;
  const result = await page.evaluate(() => window.commandCenter.nx.get());
  const r = result as { ok: boolean; error?: string; data?: { projects: Record<string, { type: string }> } };
  if (!r.ok) throw new Error(`nx.get failed: ${r.error ?? 'unknown'}`);
  const projects = Object.values(r.data!.projects);
  expect(projects.length).toBeGreaterThan(20);
  expect(projects.some((p) => p.type === 'app')).toBe(true);
  expect(projects.some((p) => p.type === 'lib')).toBe(true);
});
