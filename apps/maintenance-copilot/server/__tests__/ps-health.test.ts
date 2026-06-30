import { describe, expect, it } from 'vitest';
import { parseGitStatus, type RunResult } from '../ps-health.js';

const ok = (stdout: string): RunResult => ({ success: true, stdout, stderr: '' });
const fail = (): RunResult => ({ success: false, stdout: '', stderr: '', error: 'not a repo' });

describe('parseGitStatus', () => {
  it('degrades gracefully when branch resolution fails (no repo / git missing)', () => {
    expect(parseGitStatus(fail(), fail(), fail())).toEqual({
      branch: 'unknown',
      isDirty: false,
      recentCommits: [],
    });
  });

  it('parses branch, a dirty working tree, and recent commits', () => {
    const r = parseGitStatus(
      ok('main'),
      ok(' M file.ts\n?? new.ts'),
      ok('abc123 feat: thing\ndef456 fix: bug'),
    );
    expect(r.branch).toBe('main');
    expect(r.isDirty).toBe(true);
    expect(r.recentCommits).toEqual([
      { hash: 'abc123', message: 'feat: thing' },
      { hash: 'def456', message: 'fix: bug' },
    ]);
  });

  it('reports a clean tree, a hash-only commit line, and an unavailable log', () => {
    const clean = parseGitStatus(ok('main'), ok(''), ok('abcdef0'));
    expect(clean.isDirty).toBe(false);
    expect(clean.recentCommits).toEqual([{ hash: 'abcdef0', message: '' }]);

    const noLog = parseGitStatus(ok('main'), ok(''), fail());
    expect(noLog.recentCommits).toEqual([]);
  });
});
