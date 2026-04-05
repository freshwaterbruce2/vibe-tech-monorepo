import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningRecommendationResult, UserStats } from '../../services/appIntegration';
import { useDatabase } from '../useDatabase';

// Mock appIntegration
vi.mock('../../services/appIntegration', () => ({
  appIntegration: {
    initialize: vi.fn().mockResolvedValue(undefined),
    isDatabaseAvailable: vi.fn().mockReturnValue(true),
    getDatabaseStatus: vi.fn().mockReturnValue('Connected'),
    getHomeworkItems: vi.fn().mockResolvedValue([]),
    getUserStats: vi.fn().mockResolvedValue(null),
    saveHomeworkItem: vi.fn().mockResolvedValue(undefined),
    deleteHomeworkItem: vi.fn().mockResolvedValue(undefined),
    startLearningSession: vi.fn(),
    updateLearningPerformance: vi.fn(),
    updateFocusLevel: vi.fn(),
    endLearningSession: vi.fn().mockResolvedValue(undefined),
    getLearningRecommendations: vi.fn().mockResolvedValue([]),
    getAdaptiveDifficulty: vi.fn().mockResolvedValue('medium'),
    exportData: vi.fn().mockResolvedValue('{}'),
    importData: vi.fn().mockResolvedValue(undefined),
  },
}));

import { appIntegration } from '../../services/appIntegration';

const mocked = vi.mocked(appIntegration);

describe('useDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.initialize.mockResolvedValue(undefined);
    mocked.isDatabaseAvailable.mockReturnValue(true);
    mocked.getDatabaseStatus.mockReturnValue('Connected');
    mocked.getHomeworkItems.mockResolvedValue([]);
    mocked.getUserStats.mockResolvedValue(null as unknown as UserStats);
  });

  it('should start with initializing status', () => {
    const { result } = renderHook(() => useDatabase());
    expect(result.current.status.isInitializing).toBe(true);
    expect(result.current.status.status).toBe('Initializing...');
  });

  it('should initialize database and update status', async () => {
    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isConnected).toBe(true);
      expect(result.current.status.status).toBe('Connected');
      expect(result.current.status.isInitializing).toBe(false);
    });
  });

  it('should load homework items on init', async () => {
    const items = [
      { id: '1', subject: 'Math', title: 'HW1', dueDate: '2026-01-01', completed: false },
    ];
    mocked.getHomeworkItems.mockResolvedValue(items);

    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.homeworkItems).toEqual(items);
    });
  });

  it('should load user stats on init', async () => {
    const stats = { totalSessions: 5, totalTime: 120 };
    mocked.getUserStats.mockResolvedValue(stats as unknown as UserStats);

    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.stats).toEqual(stats);
    });
  });

  it('should handle initialization failure gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocked.initialize.mockRejectedValue(new Error('DB init failed'));

    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isConnected).toBe(false);
      expect(result.current.status.status).toBe('Database unavailable, using localStorage');
      expect(result.current.status.isInitializing).toBe(false);
    });

    errorSpy.mockRestore();
  });

  it('should save a homework item and reload the list', async () => {
    const newItem = {
      id: '2',
      subject: 'Science',
      title: 'Lab',
      dueDate: '2026-02-01',
      completed: false,
    };
    mocked.getHomeworkItems.mockResolvedValueOnce([]); // initial load
    mocked.getHomeworkItems.mockResolvedValueOnce([newItem]); // after save
    mocked.getHomeworkItems.mockResolvedValueOnce([newItem]); // getUserStats reload

    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    await act(async () => {
      await result.current.saveHomework(newItem);
    });

    expect(mocked.saveHomeworkItem).toHaveBeenCalledWith(newItem);
  });

  it('should delete a homework item and reload the list', async () => {
    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    await act(async () => {
      await result.current.deleteHomework('1');
    });

    expect(mocked.deleteHomeworkItem).toHaveBeenCalledWith('1');
  });

  it('should start and end a learning session', async () => {
    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    act(() => {
      result.current.startLearning('worksheet', 'Math', 'hard');
    });

    expect(mocked.startLearningSession).toHaveBeenCalledWith('worksheet', 'Math', 'hard');

    await act(async () => {
      await result.current.endLearning(0.9);
    });

    expect(mocked.endLearningSession).toHaveBeenCalledWith(0.9);
  });

  it('should update performance and focus', async () => {
    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    act(() => {
      result.current.updatePerformance(true);
    });
    expect(mocked.updateLearningPerformance).toHaveBeenCalledWith(true);

    act(() => {
      result.current.updateFocus(false);
    });
    expect(mocked.updateFocusLevel).toHaveBeenCalledWith(false);
  });

  it('should get recommendations', async () => {
    mocked.getLearningRecommendations.mockResolvedValue(['Try harder problems'] as unknown as LearningRecommendationResult);

    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    let recs: unknown;
    await act(async () => {
      recs = await result.current.getRecommendations();
    });

    expect(recs).toEqual(['Try harder problems']);
  });

  it('should export data', async () => {
    mocked.exportData.mockResolvedValue('{"data":true}');

    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.exportData();
    });

    expect(data).toBe('{"data":true}');
  });

  it('should import data and reload state', async () => {
    const { result } = renderHook(() => useDatabase());

    await vi.waitFor(() => {
      expect(result.current.status.isInitializing).toBe(false);
    });

    await act(async () => {
      await result.current.importData('{"items":[]}');
    });

    expect(mocked.importData).toHaveBeenCalledWith('{"items":[]}');
  });
});
