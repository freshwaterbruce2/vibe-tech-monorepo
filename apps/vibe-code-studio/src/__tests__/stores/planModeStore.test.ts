/**
 * planModeStore tests — spec 05 Plan Mode lifecycle: dialog visibility,
 * phase transitions, success history (newest-first, capped), and error
 * capture/reset semantics.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanModeActions, usePlanModeStore } from '../../stores/planModeStore';

beforeEach(() => {
  usePlanModeStore.setState({
    phase: 'idle',
    dialogOpen: false,
    latestPlanPath: null,
    history: [],
    error: null,
  });
});

describe('planModeStore', () => {
  it('setDialogOpen toggles the dialog flag', () => {
    const { actions } = usePlanModeStore.getState();
    actions.setDialogOpen(true);
    expect(usePlanModeStore.getState().dialogOpen).toBe(true);
    actions.setDialogOpen(false);
    expect(usePlanModeStore.getState().dialogOpen).toBe(false);
  });

  it('start enters researching and clears a previous error', () => {
    const { actions } = usePlanModeStore.getState();
    actions.fail('previous failure');
    expect(usePlanModeStore.getState().error).toBe('previous failure');

    actions.start();
    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('researching');
    expect(state.error).toBeNull();
  });

  it('setPhase sets an arbitrary phase', () => {
    usePlanModeStore.getState().actions.setPhase('writing');
    expect(usePlanModeStore.getState().phase).toBe('writing');
  });

  it('succeed marks done, records the path, and pushes history newest-first', () => {
    const { actions } = usePlanModeStore.getState();
    actions.fail('stale error');
    actions.succeed('V:/ws/.vcs/plans/first.md');
    actions.succeed('V:/ws/.vcs/plans/second.md');

    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('done');
    expect(state.error).toBeNull();
    expect(state.latestPlanPath).toBe('V:/ws/.vcs/plans/second.md');
    expect(state.history).toEqual(['V:/ws/.vcs/plans/second.md', 'V:/ws/.vcs/plans/first.md']);
  });

  it('succeed caps history at 50 entries', () => {
    const { actions } = usePlanModeStore.getState();
    for (let i = 0; i < 55; i += 1) {
      actions.succeed(`plan-${i}.md`);
    }
    const { history } = usePlanModeStore.getState();
    expect(history).toHaveLength(50);
    expect(history[0]).toBe('plan-54.md');
    expect(history[49]).toBe('plan-5.md');
  });

  it('fail enters the error phase with the message', () => {
    usePlanModeStore.getState().actions.fail('planner exploded');
    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('error');
    expect(state.error).toBe('planner exploded');
  });

  it('reset returns to idle and clears the error but keeps history', () => {
    const { actions } = usePlanModeStore.getState();
    actions.succeed('kept.md');
    actions.fail('boom');
    actions.reset();

    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.latestPlanPath).toBe('kept.md');
    expect(state.history).toEqual(['kept.md']);
  });

  it('usePlanModeActions exposes the store actions', () => {
    const { result } = renderHook(() => usePlanModeActions());
    expect(result.current).toBe(usePlanModeStore.getState().actions);
  });
});
