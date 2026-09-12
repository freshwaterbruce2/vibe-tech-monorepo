import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubjectProgress, SubjectType, WorksheetSession } from '../../types';
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
    mockedGetProgress.mockResolvedValue(null as unknown as SubjectProgress);
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

  it('publishes primary durable completion, returns true, and requests one safe delivery sync', async () => {
    mockedComplete.mockResolvedValue({
      leveledUp: true,
      newDifficulty: 'Intermediate',
      starsToNextLevel: 5,
    });

    const requestCompletionSync = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorksheet({ requestCompletionSync }));
    const session = makeSession();

    await act(async () => {
      await expect(result.current.completeWorksheetSession(session)).resolves.toBe(true);
    });

    expect(result.current.worksheetSession).toEqual(session);
    expect(result.current.worksheetLeveledUp).toBe(true);
    expect(result.current.worksheetNewDifficulty).toBe('Intermediate');
    expect(result.current.worksheetStarsToNextLevel).toBe(5);
    expect(requestCompletionSync).toHaveBeenCalledTimes(1);
  });

  it('returns false without publication or notification when primary persistence throws', async () => {
    mockedComplete.mockRejectedValue(new Error('Save failed'));
    const requestCompletionSync = vi.fn();
    const { result } = renderHook(() => useWorksheet({ requestCompletionSync }));

    await act(async () => {
      await expect(result.current.completeWorksheetSession(makeSession())).resolves.toBe(false);
    });

    expect(result.current.worksheetSession).toBeNull();
    expect(requestCompletionSync).not.toHaveBeenCalled();
  });

  it.each([
    [
      'synchronous throw',
      () => {
        throw new Error('notify failed');
      },
    ],
    ['asynchronous rejection', async () => Promise.reject(new Error('notify failed'))],
  ])('keeps durable success when notification has a %s', async (_kind, requestCompletionSync) => {
    const notification = vi.fn(requestCompletionSync);
    const { result } = renderHook(() => useWorksheet({ requestCompletionSync: notification }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const session = makeSession();

    await act(async () => {
      await expect(result.current.completeWorksheetSession(session)).resolves.toBe(true);
    });

    expect(result.current.worksheetSession).toEqual(session);
    expect(notification).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('does not expose direct token or achievement settlement callbacks', () => {
    const { result } = renderHook(() => useWorksheet());
    expect(Object.keys(result.current)).not.toEqual(
      expect.arrayContaining(['worksheetRewardError', 'retryWorksheetReward']),
    );
  });

  it('should cancel the worksheet', async () => {
    mockedGetProgress.mockResolvedValue(null as unknown as SubjectProgress);

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
