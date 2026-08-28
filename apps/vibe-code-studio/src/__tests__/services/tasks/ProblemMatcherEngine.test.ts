import { describe, expect, it } from 'vitest';
import {
  ProblemMatcherError,
  ProblemMatcherSession,
  normalizeFilePath,
  stripAnsi,
} from '../../../services/tasks/ProblemMatcherEngine';

const ESC = String.fromCharCode(27);

describe('stripAnsi', () => {
  it('removes CSI color sequences including bare reset', () => {
    expect(stripAnsi(`${ESC}[31merror${ESC}[0m done${ESC}[m`)).toBe('error done');
  });

  it('does not eat plain bracketed text', () => {
    expect(stripAnsi('[feat/x 12ab] keep [foo]')).toBe('[feat/x 12ab] keep [foo]');
  });
});

describe('normalizeFilePath', () => {
  it('keeps absolute Windows and UNC paths, unifying separators', () => {
    expect(normalizeFilePath('V:/repo/src/a.ts')).toBe('V:\\repo\\src\\a.ts');
    expect(normalizeFilePath('\\\\server\\share\\a.ts', 'V:\\x')).toBe('\\\\server\\share\\a.ts');
  });

  it('resolves relative paths against cwd, tolerating trailing slashes', () => {
    expect(normalizeFilePath('src/a.ts', 'V:\\repo\\')).toBe('V:\\repo\\src\\a.ts');
    expect(normalizeFilePath('src\\a.ts', 'V:/repo')).toBe('V:\\repo\\src\\a.ts');
  });

  it('leaves relative paths untouched without a cwd', () => {
    expect(normalizeFilePath('src/a.ts')).toBe('src\\a.ts');
  });
});

describe('$tsc matcher', () => {
  it('matches the paren format file(line,col): error TSxxxx: message', () => {
    const session = new ProblemMatcherSession('$tsc', 'build');
    const diags = session.push("src/index.ts(10,5): error TS2339: Property 'foo' missing.");
    expect(diags).toEqual([
      {
        file: 'src\\index.ts',
        line: 10,
        column: 5,
        severity: 'error',
        message: "Property 'foo' missing.",
        code: 'TS2339',
        source: 'build',
      },
    ]);
  });

  it('matches the colon-dash format and resolves against cwd', () => {
    const session = new ProblemMatcherSession('$tsc', 'build', 'V:\\repo');
    const diags = session.push('src/a.ts:3:7 - warning TS6133: unused var');
    expect(diags[0]).toMatchObject({
      file: 'V:\\repo\\src\\a.ts',
      line: 3,
      column: 7,
      severity: 'warning',
      code: 'TS6133',
    });
  });

  it('maps info severity and strips ANSI before matching', () => {
    const session = new ProblemMatcherSession('$tsc', 'build');
    const line = `${ESC}[36msrc/a.ts(1,1): info TS0000: note${ESC}[0m`;
    expect(session.push(line)[0]?.severity).toBe('info');
  });

  it('returns nothing for non-matching lines', () => {
    const session = new ProblemMatcherSession('$tsc', 'build');
    expect(session.push('Compiling...')).toEqual([]);
  });
});

describe('$eslint-stylish matcher (multi-line, loop)', () => {
  const rows = [
    'V:\\repo\\src\\app.ts',
    '  10:2  error  Missing semicolon  semi',
    '  12:4  warning  Unexpected any  @typescript-eslint/no-explicit-any',
  ];

  it('attributes looped rows to the preceding file header', () => {
    const session = new ProblemMatcherSession('$eslint-stylish', 'lint');
    expect(session.push(rows[0])).toEqual([]);
    const first = session.push(rows[1]);
    expect(first[0]).toMatchObject({
      file: 'V:\\repo\\src\\app.ts',
      line: 10,
      column: 2,
      severity: 'error',
      message: 'Missing semicolon',
      code: 'semi',
      source: 'lint',
    });
    const second = session.push(rows[2]);
    expect(second[0]).toMatchObject({
      line: 12,
      severity: 'warning',
      code: '@typescript-eslint/no-explicit-any',
    });
  });

  it('resets on a loop miss and treats the line as a fresh header', () => {
    const session = new ProblemMatcherSession('$eslint-stylish', 'lint');
    session.push(rows[0]);
    session.push(rows[1]);
    expect(session.push('V:\\repo\\src\\other.ts')).toEqual([]);
    const next = session.push('  1:1  error  Bad  rule');
    expect(next[0]?.file).toBe('V:\\repo\\src\\other.ts');
  });

  it('returns nothing when a line matches neither row nor header', () => {
    const session = new ProblemMatcherSession('$eslint-stylish', 'lint');
    session.push(rows[0]);
    expect(session.push('   just a note')).toEqual([]);
  });
});

describe('inline matchers and error handling', () => {
  it('throws ProblemMatcherError for an unknown built-in name', () => {
    expect(() => new ProblemMatcherSession('$nope', 'x')).toThrow(ProblemMatcherError);
  });

  it('throws ProblemMatcherError for an invalid regexp', () => {
    expect(() => new ProblemMatcherSession({ pattern: { regexp: '([' } }, 'x')).toThrow(
      ProblemMatcherError
    );
  });

  it('supports a single inline pattern with defaults (column 1, severity error)', () => {
    const session = new ProblemMatcherSession(
      { pattern: { regexp: '^(.+?):(\\d+) (.*)$', file: 1, line: 2, message: 3 } },
      'custom'
    );
    expect(session.push('a.py:12 boom')).toEqual([
      {
        file: 'a.py',
        line: 12,
        column: 1,
        severity: 'error',
        message: 'boom',
        source: 'custom',
      },
    ]);
  });

  it('emits nothing when a matched pattern lacks file/line captures', () => {
    const single = new ProblemMatcherSession({ pattern: { regexp: '^(\\d+)$', line: 1 } }, 'x');
    expect(single.push('42')).toEqual([]);
    const looped = new ProblemMatcherSession(
      {
        pattern: [{ regexp: '^HEADER$' }, { regexp: '^(\\d+)$', line: 1, loop: true }],
      },
      'x'
    );
    expect(looped.push('HEADER')).toEqual([]);
    expect(looped.push('7')).toEqual([]);
  });

  it('supports inline multi-pattern arrays', () => {
    const session = new ProblemMatcherSession(
      {
        pattern: [
          { regexp: '^in (.*)$', file: 1 },
          { regexp: '^at line (\\d+): (.*)$', line: 1, message: 2 },
        ],
      },
      'x'
    );
    expect(session.push('in lib.rs')).toEqual([]);
    const diags = session.push('at line 9: mismatched types');
    expect(diags[0]).toMatchObject({ file: 'lib.rs', line: 9, message: 'mismatched types' });
  });
});
