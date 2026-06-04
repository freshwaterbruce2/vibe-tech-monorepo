import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTask, getTaskSafety, listTaskKeys, runTask, telegramSafeText } from '../src/tasks.js';

let dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'vibe-it-specialist-bot-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.map(async (dir) => { await rm(dir, { recursive: true, force: true }); }));
  dirs = [];
});

describe('upgrade features', () => {
  it('lists all quick-fix presets', () => {
    expect(listTaskKeys()).toEqual(expect.arrayContaining([
      'nx-reset',
      'pnpm-install',
      'pnpm-store-prune',
      'affected-quality',
      'git-status',
      'nx-report',
    ]));
  });

  it('marks read-only diagnostics safe and mutating fixes confirmation-required', () => {
    expect(getTaskSafety(buildTask('run git-status')).requiresConfirmation).toBe(false);
    expect(getTaskSafety(buildTask('run nx-report')).requiresConfirmation).toBe(false);
    expect(getTaskSafety(buildTask('run nx-reset')).requiresConfirmation).toBe(true);
    expect(getTaskSafety(buildTask('run pnpm-install')).requiresConfirmation).toBe(true);
  });

  it('supports project-specific shortcuts in user-requested order', () => {
    expect(buildTask('project vibe-tutor typecheck').command).toBe('pnpm nx typecheck vibe-tutor');
    expect(buildTask('project vibe-it-specialist-bot build').command).toBe('pnpm nx build vibe-it-specialist-bot');
    expect(buildTask('project vibe-portal test').command).toBe('pnpm nx test vibe-portal');
  });

  it('writes persistent run history JSONL to D-style log root', async () => {
    const logRoot = await tempDir();
    const task = buildTask('run git-status', new Date('2026-06-03T00:00:00Z'), { logRoot });
    const result = await runTask(task);
    expect(result).toContain('History:');
    const history = await readFile(join(logRoot, 'runs.jsonl'), 'utf8');
    const record = JSON.parse(history.trim());
    expect(record.label).toBe('Git status');
    expect(record.command).toBe('git status --short');
    expect(record.logPath).toContain(logRoot.replaceAll('\\', '/'));
    expect(record.exitCode).toEqual(expect.any(Number));
  });

  it('formats Telegram-safe output with truncation warning', () => {
    const text = telegramSafeText('x'.repeat(5000), 100);
    expect(text.length).toBeLessThanOrEqual(100);
    expect(text).toContain('Output truncated');
  });
});
