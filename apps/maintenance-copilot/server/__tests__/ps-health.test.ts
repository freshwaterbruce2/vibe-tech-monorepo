import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseGitStatus,
  previewMaintenance,
  runMaintenance,
  type RunResult,
} from '../ps-health.js';

// Mock the child_process exec that run()/runMaintenance() shell out through.
// promisify(exec) resolves with the value passed to the callback after err, so
// invoking cb(null, { stdout, stderr }) yields the { stdout, stderr } run() expects.
const { execMock } = vi.hoisted(() => ({ execMock: vi.fn() }));
vi.mock('node:child_process', () => ({ exec: execMock }));

afterEach(() => vi.clearAllMocks());

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

describe('previewMaintenance', () => {
  it('builds the baseline command (no flags) targeting run_maintenance.py', () => {
    const cmd = previewMaintenance();
    expect(cmd).toMatch(/^python ".*run_maintenance\.py"$/);
    expect(cmd).not.toContain('--');
  });

  it('appends opt-in flags in retention → vacuum → backup order', () => {
    expect(previewMaintenance({ retention: true, vacuum: true, backup: true })).toContain(
      '--retention --vacuum --backup',
    );
  });

  it('includes only the selected flags', () => {
    expect(previewMaintenance({ backup: true })).toMatch(/--backup$/);
    const vac = previewMaintenance({ vacuum: true });
    expect(vac).toContain('--vacuum');
    expect(vac).not.toContain('--retention');
    expect(vac).not.toContain('--backup');
  });
});

describe('runMaintenance', () => {
  it('executes the built maintenance command and returns the RunResult', async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (e: null, r: unknown) => void) =>
      cb(null, { stdout: 'MAINTENANCE SUCCESS', stderr: '' }),
    );

    const r = await runMaintenance({ backup: true });

    expect(r).toEqual({ success: true, stdout: 'MAINTENANCE SUCCESS', stderr: '' });
    expect(execMock).toHaveBeenCalledTimes(1);
    const calledCmd = String(execMock.mock.calls[0][0]);
    expect(calledCmd).toContain('run_maintenance.py');
    expect(calledCmd).toContain('--backup');
  });

  it('surfaces a non-zero exit as a failed RunResult', async () => {
    execMock.mockImplementation((_cmd: string, _opts: unknown, cb: (e: Error) => void) => {
      const err = Object.assign(new Error('exit 1'), { stdout: '', stderr: 'integrity FAIL' });
      cb(err);
    });

    const r = await runMaintenance();

    expect(r.success).toBe(false);
    expect(r.stderr).toBe('integrity FAIL');
    expect(r.error).toBe('exit 1');
  });
});
