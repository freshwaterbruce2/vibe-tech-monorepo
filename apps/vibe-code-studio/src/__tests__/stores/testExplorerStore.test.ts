/**
 * testExplorerStore tests — spec 08 Phase 1 tree + run state actions.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { TestFileNode } from '../../services/testing/TestController';
import { useTestExplorerStore } from '../../stores/testExplorerStore';

const makeNode = (overrides: Partial<TestFileNode> = {}): TestFileNode => ({
  file: 'a.test.ts',
  status: 'idle',
  tests: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  ...overrides,
});

const actions = () => useTestExplorerStore.getState().actions;

beforeEach(() => {
  useTestExplorerStore.setState({
    framework: null,
    files: [],
    discovering: false,
    runningAll: false,
    panelOpen: false,
    error: null,
  });
});

describe('panel visibility', () => {
  it('setPanelOpen sets the flag explicitly', () => {
    actions().setPanelOpen(true);
    expect(useTestExplorerStore.getState().panelOpen).toBe(true);
    actions().setPanelOpen(false);
    expect(useTestExplorerStore.getState().panelOpen).toBe(false);
  });

  it('togglePanel flips the flag each call', () => {
    actions().togglePanel();
    expect(useTestExplorerStore.getState().panelOpen).toBe(true);
    actions().togglePanel();
    expect(useTestExplorerStore.getState().panelOpen).toBe(false);
  });
});

describe('run flags and error clearing', () => {
  it('setDiscovering(true) clears a previous error', () => {
    actions().setError('old failure');
    actions().setDiscovering(true);
    const state = useTestExplorerStore.getState();
    expect(state.discovering).toBe(true);
    expect(state.error).toBeNull();
  });

  it('setDiscovering(false) keeps an existing error', () => {
    actions().setError('kept');
    actions().setDiscovering(false);
    const state = useTestExplorerStore.getState();
    expect(state.discovering).toBe(false);
    expect(state.error).toBe('kept');
  });

  it('setRunningAll(true) clears a previous error', () => {
    actions().setError('old failure');
    actions().setRunningAll(true);
    const state = useTestExplorerStore.getState();
    expect(state.runningAll).toBe(true);
    expect(state.error).toBeNull();
  });

  it('setRunningAll(false) keeps an existing error', () => {
    actions().setError('kept');
    actions().setRunningAll(false);
    const state = useTestExplorerStore.getState();
    expect(state.runningAll).toBe(false);
    expect(state.error).toBe('kept');
  });

  it('setError stores and clears the message', () => {
    actions().setError('boom');
    expect(useTestExplorerStore.getState().error).toBe('boom');
    actions().setError(null);
    expect(useTestExplorerStore.getState().error).toBeNull();
  });
});

describe('tree mutations', () => {
  it('setDiscovery replaces the framework and file list', () => {
    actions().setDiscovery('jest', [makeNode({ file: 'old.test.ts' })]);
    actions().setDiscovery('vitest', [makeNode(), makeNode({ file: 'b.test.ts' })]);
    const state = useTestExplorerStore.getState();
    expect(state.framework).toBe('vitest');
    expect(state.files.map(node => node.file)).toEqual(['a.test.ts', 'b.test.ts']);
  });

  it('upsertFileNode replaces an existing node in place', () => {
    actions().setDiscovery('vitest', [makeNode(), makeNode({ file: 'b.test.ts' })]);
    actions().upsertFileNode(makeNode({ status: 'passed', passed: 3 }));
    const state = useTestExplorerStore.getState();
    expect(state.files).toHaveLength(2);
    expect(state.files[0]).toMatchObject({ file: 'a.test.ts', status: 'passed', passed: 3 });
  });

  it('upsertFileNode appends a new node when the file is unknown', () => {
    actions().upsertFileNode(makeNode({ file: 'new.test.ts', status: 'failed' }));
    const state = useTestExplorerStore.getState();
    expect(state.files).toHaveLength(1);
    expect(state.files[0]?.file).toBe('new.test.ts');
  });

  it('setFileStatus updates an existing node without touching its results', () => {
    actions().setDiscovery('vitest', [makeNode({ passed: 2 })]);
    actions().setFileStatus('a.test.ts', 'running');
    const state = useTestExplorerStore.getState();
    expect(state.files[0]).toMatchObject({ file: 'a.test.ts', status: 'running', passed: 2 });
  });

  it('setFileStatus creates an empty placeholder for an unknown file', () => {
    actions().setFileStatus('ghost.test.ts', 'failed');
    const state = useTestExplorerStore.getState();
    expect(state.files).toEqual([
      {
        file: 'ghost.test.ts',
        status: 'failed',
        tests: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
    ]);
  });
});
