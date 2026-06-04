import { describe, expect, it } from 'vitest';
import { buildTask } from '../src/tasks.js';
import { runOptimization } from '../src/optimization.js';

describe('Optimization command tasks', () => {
  it('builds full workspace optimization task', () => {
    const task = buildTask('optimize');
    expect(task.command).toBe('node apps/vibe-it-specialist-bot/dist/src/optimization.js ');
    expect(task.label).toBe('Optimization: full report');
  });

  it('builds category-specific optimization task', () => {
    const task = buildTask('optimize targets');
    expect(task.command).toBe('node apps/vibe-it-specialist-bot/dist/src/optimization.js targets');
    expect(task.label).toBe('Optimization: targets');
  });

  it('builds category-specific paths optimization task', () => {
    const task = buildTask('optimize paths');
    expect(task.command).toBe('node apps/vibe-it-specialist-bot/dist/src/optimization.js paths');
    expect(task.label).toBe('Optimization: paths');
  });

  it('builds trends category optimization task', () => {
    const task = buildTask('optimize trends');
    expect(task.command).toBe('node apps/vibe-it-specialist-bot/dist/src/trends.js');
    expect(task.label).toBe('Optimization: trends');
  });

  it('builds allowlisted run optimization task', () => {
    const task = buildTask('run optimize');
    expect(task.command).toBe('node apps/vibe-it-specialist-bot/dist/src/optimization.js');
    expect(task.label).toBe('Optimization report');
  });

  it('rejects invalid optimization category', () => {
    expect(() => buildTask('optimize invalid_category')).toThrow(/Unknown optimization category/);
  });

  it('runs optimization report and returns a summary', () => {
    const summary = runOptimization('cache');
    expect(summary).toContain('Monorepo Optimization Summary');
    expect(summary).toContain('optimization-report-');
  });
});
