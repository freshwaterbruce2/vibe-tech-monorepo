import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../../utils/electronStore', () => ({
  appStore: {
    get: vi.fn((key: string) => storage.get(key) ?? null),
    set: vi.fn((key: string, value: unknown) => storage.set(key, value)),
  },
}));

import { useSchedules } from '../useSchedules';

describe('useSchedules chore rewards', () => {
  beforeEach(() => storage.clear());

  it('awards a chore once, preserves the marker through uncheck/recheck, and supports legacy chores', () => {
    storage.set('vibe_schedules_data', { items: [], chores: [{ id: 'legacy', task: 'Dishes', completed: false, rewardTokens: 5 }], goals: [] });
    const { result } = renderHook(() => useSchedules());

    act(() => expect(result.current.toggleChore('legacy')).toBe(5));
    expect(result.current.chores[0]?.rewardedAt).toEqual(expect.any(Number));
    act(() => expect(result.current.toggleChore('legacy')).toBe(0));
    act(() => expect(result.current.toggleChore('legacy')).toBe(0));
    expect(result.current.chores[0]?.rewardedAt).toEqual(expect.any(Number));
  });

  it('never re-awards an already-marked chore while preserving its completion timestamp behavior', () => {
    storage.set('vibe_schedules_data', { items: [], chores: [{ id: 'marked', task: 'Laundry', completed: false, rewardTokens: 5, rewardedAt: 123 }], goals: [] });
    const { result } = renderHook(() => useSchedules());

    act(() => expect(result.current.toggleChore('marked')).toBe(0));
    expect(result.current.chores[0]).toEqual(expect.objectContaining({ completed: true, rewardedAt: 123, completedAt: expect.any(Number) }));
  });
});
