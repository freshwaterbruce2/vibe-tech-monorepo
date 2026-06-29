import { renderHook } from '@testing-library/react';
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
});
