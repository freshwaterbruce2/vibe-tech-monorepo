import { test, expect } from '@playwright/test';
import { launchApp, closeApp, type AppFixture } from './fixture';
import { existsSync, readdirSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let fixture: AppFixture;
let tmpSource: string;

test.beforeEach(async () => {
  tmpSource = mkdtempSync(join(tmpdir(), 'cc-e2e-bkp-'));
  mkdirSync(join(tmpSource, 'src'), { recursive: true });
  writeFileSync(join(tmpSource, 'src', 'a.ts'), 'export const x = 1;');
  fixture = await launchApp();
});
test.afterEach(async () => {
  await closeApp(fixture);
  rmSync(tmpSource, { recursive: true, force: true });
});

test('creating a backup via IPC produces a real zip on disk', async () => {
  const { page } = fixture;

  const result = await page.evaluate(async (sourcePath) => {
    return await window.commandCenter.backup.create({
      sourcePath,
      label: 'e2e-test'
    });
  }, tmpSource);

  expect((result as { ok: boolean }).ok).toBe(true);
  const data = (result as { ok: true; data: { zipPath: string; sizeBytes: number } }).data;
  expect(data.zipPath).toMatch(/\.zip$/);
  expect(data.sizeBytes).toBeGreaterThan(0);
  expect(existsSync(data.zipPath)).toBe(true);
});

test('quick-backup button on Backups panel triggers backup.create', async () => {
  const { page } = fixture;
  await page.getByRole('button', { name: /Backups/ }).click();
  await expect(page.locator('text=/Recent Backups/')).toBeVisible({ timeout: 10_000 });

  const before = existsSync('C:\\dev\\_backups')
    ? readdirSync('C:\\dev\\_backups').filter((f) => f.endsWith('.zip')).length
    : 0;

  await page.getByRole('button', { name: /Backup packages\// }).click();

  await expect(page.locator('text=/backup created/')).toBeVisible({ timeout: 30_000 });

  const after = readdirSync('C:\\dev\\_backups').filter((f) => f.endsWith('.zip')).length;
  expect(after).toBeGreaterThan(before);
});
