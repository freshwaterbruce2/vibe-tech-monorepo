import { describe, expect, it } from 'vitest';
import {
  findDefaultTask,
  getGroupKind,
  parseTasksJson,
  stripJsonComments,
} from '../../../services/tasks/TaskParser';
import type { VcsTask } from '../../../services/tasks/types';

const VALID_TASKS_JSON = JSON.stringify({
  version: '2.0.0',
  tasks: [
    {
      label: 'build',
      type: 'shell',
      command: 'pnpm',
      args: ['build'],
      group: { kind: 'build', isDefault: true },
      problemMatcher: '$tsc',
      presentation: { reveal: 'always', panel: 'shared' },
    },
    {
      label: 'test',
      command: 'pnpm',
      args: ['test'],
      group: 'test',
      dependsOn: 'build',
    },
  ],
});

describe('stripJsonComments', () => {
  it('strips line comments but keeps // inside strings', () => {
    const input = '{\n// comment\n"url": "https://x.dev" // trailing\n}';
    const stripped = stripJsonComments(input);
    expect(stripped).toContain('https://x.dev');
    expect(stripped).not.toContain('comment');
    expect(stripped).not.toContain('trailing');
  });

  it('strips block comments across lines', () => {
    const input = '{ /* multi\nline */ "a": 1 }';
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 1 });
  });

  it('handles escaped quotes inside strings', () => {
    const input = '{ "a": "say \\"hi\\" // not a comment" }';
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 'say "hi" // not a comment' });
  });
});

describe('parseTasksJson', () => {
  it('parses a valid tasks.json and applies the shell type default', () => {
    const result = parseTasksJson(VALID_TASKS_JSON);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].label).toBe('build');
    expect(result.tasks[1].type).toBe('shell');
  });

  it('accepts JSONC comments like VS Code tasks.json', () => {
    const withComments = `{
      // task definitions
      "version": "2.0.0",
      "tasks": [{ "label": "lint", "command": "pnpm" /* inline */ }]
    }`;
    const result = parseTasksJson(withComments);
    expect(result.ok).toBe(true);
  });

  it('returns a typed error for invalid JSON, not a throw', () => {
    const result = parseTasksJson('{ not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/^Invalid JSON:/);
  });

  it('reports the schema error path for a bad field', () => {
    const bad = JSON.stringify({ version: '2.0.0', tasks: [{ label: '', command: 'x' }] });
    const result = parseTasksJson(bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('tasks.0.label');
  });

  it('reports (root) when the top-level shape is wrong', () => {
    const result = parseTasksJson('[]');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('(root)');
  });

  it('rejects duplicate task labels', () => {
    const dup = JSON.stringify({
      version: '2.0.0',
      tasks: [
        { label: 'build', command: 'a' },
        { label: 'build', command: 'b' },
      ],
    });
    const result = parseTasksJson(dup);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('Duplicate task label');
  });

  it('accepts inline problem matcher pattern objects', () => {
    const inline = JSON.stringify({
      version: '2.0.0',
      tasks: [
        {
          label: 'watch',
          command: 'pnpm',
          isBackground: true,
          dependsOn: ['build'],
          dependsOrder: 'sequence',
          problemMatcher: {
            pattern: {
              regexp: '^(.*):(\\d+):(\\d+): (error|warning): (.*)$',
              file: 1,
              line: 2,
              column: 3,
              severity: 4,
              message: 5,
            },
          },
        },
      ],
    });
    expect(parseTasksJson(inline).ok).toBe(true);
  });
});

describe('getGroupKind', () => {
  it('returns none / string kind / object kind', () => {
    const base: VcsTask = { label: 'a', type: 'shell', command: 'x' };
    expect(getGroupKind(base)).toBe('none');
    expect(getGroupKind({ ...base, group: 'test' })).toBe('test');
    expect(getGroupKind({ ...base, group: { kind: 'build' } })).toBe('build');
  });
});

describe('findDefaultTask', () => {
  const task = (label: string, group?: VcsTask['group']): VcsTask => ({
    label,
    type: 'shell',
    command: 'x',
    ...(group !== undefined ? { group } : {}),
  });

  it('prefers the explicit isDefault task', () => {
    const tasks = [task('a', 'build'), task('b', { kind: 'build', isDefault: true })];
    expect(findDefaultTask(tasks, 'build')?.label).toBe('b');
  });

  it('falls back to a single task of the kind', () => {
    const tasks = [task('a', 'build'), task('b', 'test')];
    expect(findDefaultTask(tasks, 'build')?.label).toBe('a');
  });

  it('returns undefined when ambiguous or absent', () => {
    expect(findDefaultTask([task('a', 'build'), task('b', 'build')], 'build')).toBeUndefined();
    expect(findDefaultTask([task('a')], 'build')).toBeUndefined();
  });
});
