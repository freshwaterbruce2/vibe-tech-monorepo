import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubjectType, WorksheetSession } from '../../types';
import { useWorksheet } from '../useWorksheet';

// Mock progressionService
vi.mock('../../services/progressionService', () => ({
  getSubjectProgress: vi.fn().mockResolvedValue(null),
  completeWorksheet: vi.fn().mockResolvedValue({
    leveledUp: false,
    newDifficulty: undefined,
    starsToNextLevel: 3,
  }),
}));

import { completeWorksheet, getSubjectProgress } from '../../services/progressionService';

const mockedGetProgress = vi.mocked(getSubjectProgress);
const mockedComplete = vi.mocked(completeWorksheet);

const makeSession = (overrides: Partial<WorksheetSession> = {}): WorksheetSession => ({
  id: 'ws-1',
  subject: 'Math' as SubjectType,
  difficulty: 'Beginner',
  questions: [],
  answers: [],
  score: 80,
  starsEarned: 4,
  completedAt: Date.now(),
  timeSpent: 120,
  ...overrides,
});

describe('useWorksheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetProgress.mockResolvedValue(null as any);
    mockedComplete.mockResolvedValue({
      leveledUp: false,
      newDifficulty: undefined,
      starsToNextLevel: 3,
    });
  });

  it('should initialise with null subject and session', () => {
    const { result } = renderHook(() => useWorksheet());
    expect(result.current.worksheetSubject).toBeNull();
    expect(result.current.worksheetSession).toBeNull();
    expect(result.current.worksheetProgress).toBeNull();
    expect(result.current.worksheetLeveledUp).toBe(false);
    expect(result.current.isLoadingProgress).toBe(false);
  });

  it('should start a worksheet and load progress', async () => {
    const mockProgress = {
      subject: 'Math' as SubjectType,
      currentDifficulty: 'Beginner' as const,
      starsCollected: 2,
      totalWorksheetsCompleted: 5,
      averageScore: 75,
      bestScore: 95,
      currentStreak: 3,
      history: [],
      unlockedAt: Date.now(),
    };
    mockedGetProgress.mockResolvedValue(mockProgress);

    const { result } = renderHook(() => useWorksheet());

    act(() => {
      result.current.startWorksheet('Math');
    });

    expect(result.current.worksheetSubject).toBe('Math');
    expect(result.current.isLoadingProgress).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.worksheetProgress).toEqual(mockProgress);
      expect(result.current.isLoadingProgress).toBe(false);
    });
  });

  it('should complete a worksheet session', async () => {
    mockedComplete.mockResolvedValue({
      leveledUp: true,
      newDifficulty: 'Intermediate',
      starsToNextLevel: 5,
    });

    const { result } = renderHook(() => useWorksheet());
    const session = makeSession();

    await act(async () => {
      await result.current.completeWorksheetSession(session);
    });

    expect(result.current.worksheetSession).toEqual(session);
    expect(result.current.worksheetLeveledUp).toBe(true);
    expect(result.current.worksheetNewDifficulty).toBe('Intermediate');
    expect(result.current.worksheetStarsToNextLevel).toBe(5);
  });

  it('should call onAwardTokens when stars are earned', async () => {
    const onAwardTokens = vi.fn();

    const { result } = renderHook(() => useWorksheet({ onAwardTokens }));
    const session = makeSession({ starsEarned: 4 });

    await act(async () => {
      await result.current.completeWorksheetSession(session);
    });

    expect(onAwardTokens).toHaveBeenCalledWith(4);
  });

  it('should call onAchievementEvent with worksheet completion details', async () => {
    const onAchievementEvent = vi.fn();

    const { result } = renderHook(() => useWorksheet({ onAchievementEvent }));
    const session = makeSession({ starsEarned: 3 });

    await act(async () => {
      await result.current.completeWorksheetSession(session);
    });

    expect(onAchievementEvent).toHaveBeenCalledWith({
      type: 'WORKSHEET_COMPLETED',
      payload: {
        subject: 'Math',
        score: 80,
        starsEarned: 3,
        tokensEarned: 3,
      },
    });
  });

  it('should still call onAchievementEvent for low-scoring worksheets', async () => {
    const onAchievementEvent = vi.fn();

    const { result } = renderHook(() => useWorksheet({ onAchievementEvent }));
    const session = makeSession({ starsEarned: 2 });

    await act(async () => {
      await result.current.completeWorksheetSession(session);
    });

    expect(onAchievementEvent).toHaveBeenCalledWith({
      type: 'WORKSHEET_COMPLETED',
      payload: {
        subject: 'Math',
        score: 80,
        starsEarned: 2,
        tokensEarned: 2,
      },
    });
  });

  it('should cancel the worksheet', async () => {
    mockedGetProgress.mockResolvedValue(null as any);

    const { result } = renderHook(() => useWorksheet());

    act(() => {
      result.current.startWorksheet('Science');
    });

    expect(result.current.worksheetSubject).toBe('Science');

    act(() => {
      result.current.cancelWorksheet();
    });

    expect(result.current.worksheetSubject).toBeNull();
    expect(result.current.worksheetSession).toBeNull();
  });

  it('should try again (keep subject, clear session)', async () => {
    const { result } = renderHook(() => useWorksheet());

    act(() => {
      result.current.startWorksheet('Math');
    });

    await act(async () => {
      await result.current.completeWorksheetSession(makeSession());
    });

    expect(result.current.worksheetSession).toBeTruthy();

    act(() => {
      result.current.tryAgain();
    });

    expect(result.current.worksheetSubject).toBe('Math'); // retained
    expect(result.current.worksheetSession).toBeNull(); // cleared
    expect(result.current.worksheetLeveledUp).toBe(false);
  });

  it('should reset to initial state', async () => {
    const { result } = renderHook(() => useWorksheet());

    act(() => {
      result.current.startWorksheet('History');
    });

    await act(async () => {
      await result.current.completeWorksheetSession(makeSession({ subject: 'History' }));
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.worksheetSubject).toBeNull();
    expect(result.current.worksheetSession).toBeNull();
    expect(result.current.worksheetProgress).toBeNull();
    expect(result.current.worksheetLeveledUp).toBe(false);
  });

  it('should handle progress loading error gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedGetProgress.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useWorksheet());

    act(() => {
      result.current.startWorksheet('Bible');
    });

    await vi.waitFor(() => {
      expect(result.current.worksheetProgress).toBeNull();
      expect(result.current.isLoadingProgress).toBe(false);
    });

    errorSpy.mockRestore();
  });

  it('should handle worksheet completion error gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedComplete.mockRejectedValue(new Error('Save failed'));

    const { result } = renderHook(() => useWorksheet());

    await act(async () => {
      await result.current.completeWorksheetSession(makeSession());
    });

    expect(result.current.worksheetSession).toBeNull(); // dispatch never happened
    errorSpy.mockRestore();
  });

  it('should call continueToSubjects (same as cancel)', () => {
    const { result } = renderHook(() => useWorksheet());

    act(() => {
      result.current.startWorksheet('Math');
    });

    act(() => {
      result.current.continueToSubjects();
    });

    expect(result.current.worksheetSubject).toBeNull();
  });
});
