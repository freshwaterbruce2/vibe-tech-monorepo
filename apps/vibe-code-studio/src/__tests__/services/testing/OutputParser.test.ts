/**
 * OutputParser tests — focused on the skipped/todo/pending classification that
 * TestController relies on for its 'skipped' tree nodes. Jest marks skipped for
 * status skipped/pending/todo; Vitest for state skip/todo. Passed/failed keep
 * their existing semantics (skipped stays falsey).
 */
import { describe, expect, it, vi } from 'vitest';
import { OutputParser } from '../../../services/testing/OutputParser';
import type { TestFrameworkInfo, TestResult } from '../../../services/testing/types';

const framework = (name: 'jest' | 'vitest'): TestFrameworkInfo => ({
  name,
  command: name,
  args: [],
  patterns: ['**/*.test.ts'],
  supports: { coverage: false, watch: false, filtering: false, bail: false, parallel: false },
});

const byName = (tests: TestResult[], name: string): TestResult | undefined =>
  tests.find(t => t.testName === name);

describe('OutputParser — Jest skipped/pending/todo classification', () => {
  it('sets skipped for skipped/pending/todo, leaves passed/failed as failures', () => {
    const jestJson = JSON.stringify({
      testResults: [
        {
          name: 'a.test.ts',
          assertionResults: [
            { status: 'passed', fullName: 'passes', duration: 1 },
            { status: 'skipped', fullName: 'is skipped' },
            { status: 'pending', fullName: 'is pending' },
            { status: 'todo', fullName: 'is todo' },
            { status: 'failed', fullName: 'breaks', failureMessages: ['boom'] },
          ],
        },
      ],
    });
    const parser = new OutputParser(vi.fn());
    const suite = parser.parseTestOutput(framework('jest'), jestJson, '', 0);

    expect(byName(suite.tests, 'passes')).toMatchObject({ passed: true, skipped: false });
    expect(byName(suite.tests, 'is skipped')?.skipped).toBe(true);
    expect(byName(suite.tests, 'is pending')?.skipped).toBe(true);
    expect(byName(suite.tests, 'is todo')?.skipped).toBe(true);
    const failed = byName(suite.tests, 'breaks');
    expect(failed?.passed).toBe(false);
    expect(failed?.skipped).toBe(false);
    expect(failed?.error).toBe('boom');
  });
});

describe('OutputParser — Vitest skip/todo classification', () => {
  it('sets skipped for state skip/todo and keeps pass/fail semantics (incl. nested suites)', () => {
    const vitestJson = JSON.stringify({
      results: [
        {
          file: 'b.test.ts',
          tasks: [
            { type: 'test', name: 'passes', result: { state: 'pass', duration: 2 } },
            { type: 'test', name: 'is skipped', result: { state: 'skip' } },
            { type: 'test', name: 'is todo', result: { state: 'todo' } },
            {
              type: 'suite',
              tasks: [
                {
                  type: 'test',
                  name: 'breaks',
                  result: { state: 'fail', error: { message: 'nope' } },
                },
              ],
            },
          ],
        },
      ],
    });
    const parser = new OutputParser(vi.fn());
    const suite = parser.parseTestOutput(framework('vitest'), vitestJson, '', 1);

    expect(byName(suite.tests, 'passes')).toMatchObject({ passed: true, skipped: false });
    expect(byName(suite.tests, 'is skipped')?.skipped).toBe(true);
    expect(byName(suite.tests, 'is todo')?.skipped).toBe(true);
    const failed = byName(suite.tests, 'breaks');
    expect(failed?.passed).toBe(false);
    expect(failed?.skipped).toBe(false);
    expect(failed?.error).toBe('nope');
    // nested suite test was extracted with the parent file
    expect(failed?.location?.file).toBe('b.test.ts');
  });
});
