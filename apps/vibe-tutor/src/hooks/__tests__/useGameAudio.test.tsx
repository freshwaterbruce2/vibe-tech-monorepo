import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { isSoundFeedbackEnabled } = vi.hoisted(() => ({ isSoundFeedbackEnabled: vi.fn() }));
vi.mock('../../services/sensoryPreferences', () => ({ isSoundFeedbackEnabled }));

import { useGameAudio } from '../useGameAudio';

describe('useGameAudio sensory gate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    isSoundFeedbackEnabled.mockReturnValue(true);
    vi.spyOn(window.AudioContext.prototype, 'createOscillator');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('blocks delayed tones after sound is disabled live', () => {
    const { result } = renderHook(() => useGameAudio());
    act(() => window.dispatchEvent(new Event('click')));

    act(() => result.current.playSound('success'));
    expect(window.AudioContext.prototype.createOscillator).toHaveBeenCalledTimes(1);

    isSoundFeedbackEnabled.mockReturnValue(false);
    act(() => vi.advanceTimersByTime(100));
    expect(window.AudioContext.prototype.createOscillator).toHaveBeenCalledTimes(1);
  });
});
