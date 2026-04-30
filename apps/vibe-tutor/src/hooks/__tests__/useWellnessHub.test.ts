import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWellnessHub } from '../useWellnessHub';

vi.mock('../../services/dailyAffirmations', () => ({
  getDailyAffirmation: vi.fn(() => ({
    id: 'affirm-1',
    category: 'progress',
    text: 'You can do hard things.',
  })),
  getTodayEntry: vi.fn(() => null),
  saveDailyEntry: vi.fn(),
}));

vi.mock('../../services/cbtThoughtReframing', () => ({
  getThoughtHistory: vi.fn(() => []),
  createThoughtEntry: vi.fn((situation: string, thought: string, emotion: string, intensity: number) => ({
    id: 'entry-1',
    situation,
    automaticThought: thought,
    emotion,
    emotionIntensity: intensity,
    identifiedPattern: null,
    challengingQuestions: [],
    reframedThought: null,
    newEmotion: null,
    newEmotionIntensity: null,
    timestamp: Date.now(),
  })),
  saveThoughtEntry: vi.fn(),
}));

import {
  getTodayEntry,
  saveDailyEntry,
} from '../../services/dailyAffirmations';
import {
  createThoughtEntry,
  saveThoughtEntry,
} from '../../services/cbtThoughtReframing';

describe('useWellnessHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables check-in save only when there are unsaved changes', () => {
    vi.mocked(getTodayEntry).mockReturnValue({
      date: '2026-04-29',
      morningAffirmation: { id: 'x', category: 'progress', text: 'x' },
      mood: 'good',
      eveningReflection: 'steady',
      timestamp: Date.now(),
    });

    const { result } = renderHook(() => useWellnessHub());

    expect(result.current.canSaveToday).toBe(false);

    act(() => {
      result.current.setReflection('steady but tired');
    });

    expect(result.current.canSaveToday).toBe(true);
  });

  it('saves today check-in and updates saved state snapshot', () => {
    const { result } = renderHook(() => useWellnessHub());

    act(() => {
      result.current.setMood('great');
      result.current.setReflection('Feeling confident');
    });

    expect(result.current.canSaveToday).toBe(true);

    act(() => {
      result.current.saveTodayEntry();
    });

    expect(saveDailyEntry).toHaveBeenCalledTimes(1);
    expect(result.current.savedToday).toBe(true);
    expect(result.current.canSaveToday).toBe(false);
  });

  it('submits thought entry with trimmed values and resets form', () => {
    const { result } = renderHook(() => useWellnessHub());

    act(() => {
      result.current.setShowAddEntry(true);
      result.current.setNewSituation('  Math quiz  ');
      result.current.setNewThought('  I am going to fail  ');
      result.current.setNewEmotion('  nervous ');
      result.current.setNewIntensity(8);
    });

    act(() => {
      result.current.submitThoughtEntry();
    });

    expect(createThoughtEntry).toHaveBeenCalledWith(
      'Math quiz',
      'I am going to fail',
      'nervous',
      8,
    );
    expect(saveThoughtEntry).toHaveBeenCalledTimes(1);
    expect(result.current.showAddEntry).toBe(false);
    expect(result.current.newSituation).toBe('');
    expect(result.current.newThought).toBe('');
    expect(result.current.newEmotion).toBe('');
    expect(result.current.newIntensity).toBe(5);
  });

  it('resets thought-entry draft when canceled and reopened', () => {
    const { result } = renderHook(() => useWellnessHub());

    act(() => {
      result.current.toggleAddEntry();
      result.current.setNewSituation('Upcoming exam');
      result.current.setNewThought('I might mess this up');
      result.current.setNewEmotion('worried');
      result.current.setNewIntensity(9);
    });

    expect(result.current.showAddEntry).toBe(true);
    expect(result.current.canSubmitThought).toBe(true);

    act(() => {
      result.current.cancelThoughtEntry();
    });

    expect(result.current.showAddEntry).toBe(false);
    expect(result.current.newSituation).toBe('');
    expect(result.current.newThought).toBe('');
    expect(result.current.newEmotion).toBe('');
    expect(result.current.newIntensity).toBe(5);
    expect(result.current.canSubmitThought).toBe(false);

    act(() => {
      result.current.toggleAddEntry();
    });

    expect(result.current.showAddEntry).toBe(true);
    expect(result.current.newSituation).toBe('');
  });
});
