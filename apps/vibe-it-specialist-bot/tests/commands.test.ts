import { describe, expect, it } from 'vitest';
import { buildTask, redactSensitiveOutput, runTask } from '../src/tasks.js';

describe('IT specialist tasks', () => {
  it('builds diagnosis tasks with safe D-drive logs', () => {
    const task = buildTask('diagnose');
    expect(task.cwd).toBe('C:/dev');
    expect(task.logPath.startsWith('D:/logs/vibe-it-specialist-bot/')).toBe(true);
    expect(task.command).toContain('pnpm nx report');
  });

  it('builds target typecheck tasks', () => {
    const task = buildTask('typecheck vibe-tutor');
    expect(task.command).toBe('pnpm nx typecheck vibe-tutor');
  });

  it('builds project action tasks', () => {
    const task1 = buildTask('project typecheck vibe-tutor');
    expect(task1.command).toBe('pnpm nx typecheck vibe-tutor');

    const task2 = buildTask('project build vibe-tutor');
    expect(task2.command).toBe('pnpm nx build vibe-tutor');

    const task3 = buildTask('project test vibe-tutor');
    expect(task3.command).toBe('pnpm nx test vibe-tutor');
  });

  it('builds git and pnpm task shortcuts', () => {
    const task1 = buildTask('git status');
    expect(task1.command).toBe('git status --short');

    const task2 = buildTask('nx report');
    expect(task2.command).toBe('pnpm nx report');

    const task3 = buildTask('pnpm install-check');
    expect(task3.command).toBe('pnpm install --frozen-lockfile');

    const task4 = buildTask('pnpm store prune');
    expect(task4.command).toBe('pnpm store prune');

    const task5 = buildTask('pnpm nx reset');
    if (process.platform === 'win32') {
      expect(task5.command).toContain('nx daemon --stop');
    } else {
      expect(task5.command).toBe('pnpm nx reset');
    }

    const task6 = buildTask('status');
    expect(task6.command).toBe('node apps/vibe-it-specialist-bot/dist/src/status.js');
    expect(task6.label).toBe('Bot status');

    const task7 = buildTask('ci');
    expect(task7.command).toBe('node apps/vibe-it-specialist-bot/dist/src/ci.js');
    expect(task7.label).toBe('Bot CI/CD status');
  });

  it('builds allowlisted run tasks', () => {
    const task1 = buildTask('run git-status');
    expect(task1.command).toBe('git status --short');

    const task2 = buildTask('run nx-report');
    expect(task2.command).toBe('pnpm nx report');

    expect(() => buildTask('run invalid-task')).toThrow(/is not allowlisted/);
  });

  it('rejects cmd commands for security', () => {
    expect(() => buildTask('cmd git status')).toThrow(/cmd command is disabled/);
  });

  it('rejects unknown task shortcuts', () => {
    expect(() => buildTask('unknown')).toThrow(/Unknown IT task/);
  });

  it('builds fix tasks requiring confirmation', () => {
    const task1 = buildTask('fix path-policy');
    expect(task1.command).toBe('node apps/vibe-it-specialist-bot/dist/src/fix-paths.js');
    expect(task1.requiresConfirmation).toBe(true);

    const task2 = buildTask('fix typescript-version');
    expect(task2.command).toBe('node apps/vibe-it-specialist-bot/dist/src/fix-typescript.js');
    expect(task2.requiresConfirmation).toBe(true);

    const task3 = buildTask('fix target-coverage');
    expect(task3.command).toBe('node apps/vibe-it-specialist-bot/dist/src/fix-targets.js');
    expect(task3.requiresConfirmation).toBe(true);
  });

  it('redacts common secrets from command output', () => {
    const output = redactSensitiveOutput('BOT_TOKEN=abc openai_api_key=bar 123456789:ABCdefGhIJKlmNoPQRstUVwxyZ123456789 password=123 token=abc');
    expect(output).toBe('BOT_TOKEN=*** openai_api_key=*** ***telegram-token*** password=*** token=***');
  });

  it('runs tasks via runTask and enforces D-drive log path', async () => {
    const task = buildTask('run git-status');
    expect(task.logPath.startsWith('D:/logs/vibe-it-specialist-bot/')).toBe(true);
    const result = await runTask(task);
    expect(result).toContain('Task: Git status');
    expect(result).toContain('Exit log: D:/logs/vibe-it-specialist-bot/');
  });
});
