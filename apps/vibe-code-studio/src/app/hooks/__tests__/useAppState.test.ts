import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppState } from '../useAppState';
import { useAIStore } from '../../../stores/useAIStore';

/**
 * useAppState seeds the model picker from the persisted AI store so the UI shows
 * the user's saved selection on boot instead of the hardcoded default.
 */
describe('useAppState — model seeding', () => {
  beforeEach(() => {
    useAIStore.getState().actions.setModel('moonshot/kimi-2.5-pro');
  });

  it('initializes currentModel from the persisted AI store', () => {
    useAIStore.getState().actions.setModel('openai/gpt-5.2');

    const { result } = renderHook(() => useAppState());

    expect(result.current.currentModel).toBe('openai/gpt-5.2');
  });

  it('reacts when Settings changes the persisted AI model', () => {
    const { result } = renderHook(() => useAppState());

    act(() => useAIStore.getState().actions.setModel('anthropic/claude-sonnet-4.6'));

    expect(result.current.currentModel).toBe('anthropic/claude-sonnet-4.6');
  });
});

/**
 * The Git panel was unreachable: useAppState exposed `gitPanelOpen` with no
 * setter, so nothing could open <GitPanel/>. It must now ship a working setter.
 */
describe('useAppState — git panel setter', () => {
  it('defaults gitPanelOpen to false and exposes a working setGitPanelOpen', () => {
    const { result } = renderHook(() => useAppState());

    expect(result.current.gitPanelOpen).toBe(false);
    expect(typeof result.current.setGitPanelOpen).toBe('function');

    act(() => result.current.setGitPanelOpen(true));
    expect(result.current.gitPanelOpen).toBe(true);

    act(() => result.current.setGitPanelOpen(false));
    expect(result.current.gitPanelOpen).toBe(false);
  });
});
