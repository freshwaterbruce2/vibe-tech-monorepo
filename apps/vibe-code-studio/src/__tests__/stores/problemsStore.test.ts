import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  countBySeverity,
  flattenDiagnostics,
  groupByFile,
  useProblemsActions,
  useProblemsStore,
} from '../../stores/problemsStore';
import type { Diagnostic } from '../../services/tasks/types';

const diag = (overrides: Partial<Diagnostic>): Diagnostic => ({
  file: 'V:\\ws\\a.ts',
  line: 1,
  column: 1,
  severity: 'error',
  message: 'boom',
  source: 'build',
  ...overrides,
});

beforeEach(() => {
  useProblemsStore.getState().actions.clearAll();
});

describe('problemsStore actions', () => {
  it('appends to a new source and accumulates on an existing one', () => {
    const { actions } = useProblemsStore.getState();
    actions.append('build', [diag({})]);
    actions.append('build', [diag({ line: 2 })]);
    expect(useProblemsStore.getState().bySource['build']).toHaveLength(2);
  });

  it('clears a single source without touching others', () => {
    const { actions } = useProblemsStore.getState();
    actions.append('build', [diag({})]);
    actions.append('lint', [diag({ source: 'lint' })]);
    actions.clearSource('build');
    const state = useProblemsStore.getState();
    expect(state.bySource['build']).toBeUndefined();
    expect(state.bySource['lint']).toHaveLength(1);
  });

  it('clearAll empties every source', () => {
    const { actions } = useProblemsStore.getState();
    actions.append('build', [diag({})]);
    actions.clearAll();
    expect(useProblemsStore.getState().bySource).toEqual({});
  });

  it('exposes actions via the useProblemsActions hook', () => {
    const { result } = renderHook(() => useProblemsActions());
    expect(typeof result.current.append).toBe('function');
  });
});

describe('pure helpers', () => {
  it('flattenDiagnostics merges all sources', () => {
    const flat = flattenDiagnostics({
      build: [diag({})],
      lint: [diag({ source: 'lint' }), diag({ source: 'lint', line: 9 })],
    });
    expect(flat).toHaveLength(3);
  });

  it('groupByFile preserves order and groups per path', () => {
    const groups = groupByFile([
      diag({ file: 'a.ts' }),
      diag({ file: 'b.ts' }),
      diag({ file: 'a.ts', line: 5 }),
    ]);
    expect([...groups.keys()]).toEqual(['a.ts', 'b.ts']);
    expect(groups.get('a.ts')).toHaveLength(2);
  });

  it('countBySeverity tallies each level', () => {
    const counts = countBySeverity([
      diag({}),
      diag({ severity: 'warning' }),
      diag({ severity: 'warning' }),
      diag({ severity: 'info' }),
    ]);
    expect(counts).toEqual({ error: 1, warning: 2, info: 1 });
  });
});
