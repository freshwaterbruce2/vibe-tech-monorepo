import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomework } from '../useHomework';

// Mock dataStore
vi.mock('../../services/dataStore', () => ({
  dataStore: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getHomeworkItems: vi.fn().mockResolvedValue([]),
    saveHomeworkItems: vi.fn().mockResolvedValue(undefined),
  },
}));

import { dataStore } from '../../services/dataStore';

const mockedDataStore = vi.mocked(dataStore);

describe('useHomework', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDataStore.initialize.mockResolvedValue(undefined);
    mockedDataStore.getHomeworkItems.mockResolvedValue([]);
    mockedDataStore.saveHomeworkItems.mockResolvedValue(undefined);
  });

  it('should initialise with empty homework items', () => {
    const { result } = renderHook(() => useHomework());
    expect(result.current.homeworkItems).toEqual([]);
  });

  it('should load homework items from dataStore on mount', async () => {
    const storedItems = [
      { id: '1', subject: 'Math', title: 'Fractions', dueDate: '2026-03-01', completed: false },
    ];
    mockedDataStore.getHomeworkItems.mockResolvedValue(storedItems);

    const { result } = renderHook(() => useHomework());

    // Wait for the async load effect
    await vi.waitFor(() => {
      expect(result.current.homeworkItems).toEqual(storedItems);
    });
  });

  it('waits for dataStore initialization before loading homework items', async () => {
    const storedItems = [
      { id: '1', subject: 'Math', title: 'Fractions', dueDate: '2026-03-01', completed: false },
    ];
    let resolveInitialize!: () => void;

    mockedDataStore.initialize.mockImplementation(
      async () =>
        new Promise<void>((resolve) => {
          resolveInitialize = resolve;
        }),
    );
    mockedDataStore.getHomeworkItems.mockResolvedValue(storedItems);

    const { result } = renderHook(() => useHomework());

    expect(mockedDataStore.getHomeworkItems).not.toHaveBeenCalled();

    resolveInitialize();

    await vi.waitFor(() => {
      expect(result.current.homeworkItems).toEqual(storedItems);
    });

    expect(mockedDataStore.initialize).toHaveBeenCalled();
    expect(mockedDataStore.initialize.mock.invocationCallOrder[0]).toBeLessThan(
      mockedDataStore.getHomeworkItems.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('should add a homework item', async () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({
        subject: 'Science',
        title: 'Photosynthesis',
        dueDate: '2026-04-15',
      });
    });

    expect(result.current.homeworkItems).toHaveLength(1);
    expect(result.current.homeworkItems[0]!.subject).toBe('Science');
    expect(result.current.homeworkItems[0]!.title).toBe('Photosynthesis');
    expect(result.current.homeworkItems[0]!.completed).toBe(false);
    expect(result.current.homeworkItems[0]!.id).toMatch(/^id_/);
  });

  it('should toggle homework completion (incomplete → complete)', async () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({
        subject: 'History',
        title: 'WW2 Essay',
        dueDate: '2026-05-01',
      });
    });

    const id = result.current.homeworkItems[0]!.id;

    act(() => {
      result.current.toggleComplete(id);
    });

    // Verify the state changed — the item is now completed with a timestamp
    expect(result.current.homeworkItems[0]!.completed).toBe(true);
    expect(result.current.homeworkItems[0]!.completedDate).toBeDefined();
  });

  it('should toggle homework completion (complete → incomplete)', async () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({
        subject: 'Math',
        title: 'Algebra',
        dueDate: '2026-06-01',
      });
    });

    const id = result.current.homeworkItems[0]!.id;

    // Complete it first
    act(() => {
      result.current.toggleComplete(id);
    });

    // Un-complete it
    let wasCompleted: boolean;
    act(() => {
      wasCompleted = result.current.toggleComplete(id);
    });

    expect(wasCompleted!).toBe(false);
    expect(result.current.homeworkItems[0]!.completed).toBe(false);
    expect(result.current.homeworkItems[0]!.completedDate).toBeUndefined();
  });

  it('should delete a homework item', () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'A', title: 'A1', dueDate: '2026-01-01' });
      result.current.addHomework({ subject: 'B', title: 'B1', dueDate: '2026-01-02' });
    });

    const idToDelete = result.current.homeworkItems[0]!.id;

    act(() => {
      result.current.deleteHomework(idToDelete);
    });

    expect(result.current.homeworkItems).toHaveLength(1);
    expect(result.current.homeworkItems[0]!.subject).toBe('B');
  });

  it('should update a homework item', () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'Math', title: 'Old Title', dueDate: '2026-01-01' });
    });

    const id = result.current.homeworkItems[0]!.id;

    act(() => {
      result.current.updateHomework(id, { title: 'New Title', dueDate: '2026-12-31' });
    });

    expect(result.current.homeworkItems[0]!.title).toBe('New Title');
    expect(result.current.homeworkItems[0]!.dueDate).toBe('2026-12-31');
    expect(result.current.homeworkItems[0]!.subject).toBe('Math'); // unchanged
  });

  it('should persist items to dataStore when items change', async () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'X', title: 'Y', dueDate: '2026-01-01' });
    });

    // The useEffect for persistence runs after render
    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalled();
    });
  });

  it('waits for dataStore initialization before persisting homework items', async () => {
    let resolveInitialize!: () => void;

    mockedDataStore.initialize.mockImplementation(
      async () =>
        new Promise<void>((resolve) => {
          resolveInitialize = resolve;
        }),
    );

    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'Science', title: 'Atoms', dueDate: '2026-04-15' });
    });

    expect(mockedDataStore.saveHomeworkItems).not.toHaveBeenCalled();

    resolveInitialize();

    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(1);
    });

    expect(mockedDataStore.initialize).toHaveBeenCalled();
  });

  it('preserves homework added before initialization finishes', async () => {
    let resolveInitialize!: () => void;

    mockedDataStore.initialize.mockImplementation(
      async () =>
        new Promise<void>((resolve) => {
          resolveInitialize = resolve;
        }),
    );
    mockedDataStore.getHomeworkItems.mockResolvedValue([]);

    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'Science', title: 'Atoms', dueDate: '2026-04-15' });
    });

    expect(result.current.homeworkItems).toHaveLength(1);

    resolveInitialize();

    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(1);
    });

    expect(result.current.homeworkItems).toHaveLength(1);
    expect(result.current.homeworkItems[0]!.title).toBe('Atoms');
  });
});
