/**
 * artifactsStore tests — UI mirror actions, selection invalidation, and
 * the task-grouping helper.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { Artifact } from '../../services/artifacts/types';
import { groupByTask, useArtifactsStore } from '../../stores/artifactsStore';

const artifact = (id: string, taskId: string): Artifact => ({
  id,
  taskId,
  kind: 'plan',
  title: id,
  content: '# p',
  createdAt: new Date(1000).toISOString(),
  updatedAt: new Date(1000).toISOString(),
  status: 'final',
});

beforeEach(() => {
  useArtifactsStore.setState({ artifacts: [], panelOpen: false, selectedId: null });
});

describe('artifactsStore', () => {
  it('setArtifacts replaces the list', () => {
    useArtifactsStore.getState().actions.setArtifacts([artifact('a1', 't1')]);
    expect(useArtifactsStore.getState().artifacts).toHaveLength(1);
  });

  it('clears the selection when the selected artifact disappears', () => {
    const { actions } = useArtifactsStore.getState();
    actions.setArtifacts([artifact('a1', 't1')]);
    actions.select('a1');
    expect(useArtifactsStore.getState().selectedId).toBe('a1');

    actions.setArtifacts([artifact('a2', 't1')]);
    expect(useArtifactsStore.getState().selectedId).toBeNull();
  });

  it('keeps a still-present selection', () => {
    const { actions } = useArtifactsStore.getState();
    actions.setArtifacts([artifact('a1', 't1')]);
    actions.select('a1');
    actions.setArtifacts([artifact('a1', 't1'), artifact('a2', 't2')]);
    expect(useArtifactsStore.getState().selectedId).toBe('a1');
  });

  it('panel open/toggle work', () => {
    const { actions } = useArtifactsStore.getState();
    actions.setPanelOpen(true);
    expect(useArtifactsStore.getState().panelOpen).toBe(true);
    actions.togglePanel();
    expect(useArtifactsStore.getState().panelOpen).toBe(false);
  });
});

describe('groupByTask', () => {
  it('groups artifacts by taskId preserving insertion order', () => {
    const groups = groupByTask([artifact('a1', 't1'), artifact('a2', 't2'), artifact('a3', 't1')]);
    expect([...groups.keys()]).toEqual(['t1', 't2']);
    expect(groups.get('t1')?.map(a => a.id)).toEqual(['a1', 'a3']);
  });

  it('returns an empty map for no artifacts', () => {
    expect(groupByTask([]).size).toBe(0);
  });
});
