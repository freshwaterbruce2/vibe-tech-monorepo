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

const completionJournal = vi.hoisted(() => ({
  prepareHomeworkCompletionDelivery: vi.fn().mockResolvedValue(undefined),
}));
const prepareHomeworkCompletionDelivery = completionJournal.prepareHomeworkCompletionDelivery;
vi.mock('../../services/completionDeliveryService', () => ({
  prepareHomeworkCompletionDelivery: completionJournal.prepareHomeworkCompletionDelivery,
}));

import { dataStore } from '../../services/dataStore';

const mockedDataStore = vi.mocked(dataStore);

describe('useHomework', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockedDataStore.initialize.mockResolvedValue(undefined);
    mockedDataStore.getHomeworkItems.mockResolvedValue([]);
    mockedDataStore.saveHomeworkItems.mockResolvedValue(undefined);
    prepareHomeworkCompletionDelivery.mockReset();
    prepareHomeworkCompletionDelivery.mockResolvedValue(undefined);
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

  it('does not persist an initial nonempty loaded collection after the debounce window', async () => {
    vi.useFakeTimers();
    try {
      mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
        {
          id: 'loaded',
          subject: 'Math',
          title: 'Read only',
          dueDate: '2026-07-01',
          completed: false,
        },
      ]);
      const { result } = renderHook(() => useHomework());
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.homeworkItems).toHaveLength(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(mockedDataStore.saveHomeworkItems).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    );
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
    expect(result.current.homeworkItems[0]!.id).toBe(
      'homework:11111111-1111-4111-8111-111111111111',
    );
  });

  it('fails before state or persistence when secure Homework identity is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      const { result } = renderHook(() => useHomework());
      expect(() =>
        result.current.addHomework({ subject: 'Math', title: 'No ID', dueDate: '2026-07-01' }),
      ).toThrow('Secure homework identity is unavailable');
      expect(result.current.homeworkItems).toEqual([]);
      expect(mockedDataStore.saveHomeworkItems).not.toHaveBeenCalled();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    }
  });

  it('keeps a pending debounce revision when a missing-item toggle is a no-op', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useHomework());
      await act(async () => {
        await Promise.resolve();
      });
      act(() => result.current.addHomework({ subject: 'Math', title: 'A', dueDate: '2026-07-01' }));
      await expect(result.current.toggleComplete('missing')).resolves.toEqual({ completed: false });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledWith([
        expect.objectContaining({ title: 'A', completed: false }),
      ]);
    } finally {
      vi.useRealTimers();
    }
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

    await act(async () => {
      await result.current.toggleComplete(id);
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
    await act(async () => {
      await result.current.toggleComplete(id);
    });

    // Un-complete it
    let completion: { completed: boolean } | undefined;
    await act(async () => {
      completion = await result.current.toggleComplete(id);
    });
    expect(completion!.completed).toBe(false);
    expect(result.current.homeworkItems[0]!.completed).toBe(false);
    expect(result.current.homeworkItems[0]!.completedDate).toBeUndefined();
  });

  it('prepares the exact completion intent before writing its source and never prepares uncompletion', async () => {
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
    ]);
    const order: string[] = [];
    prepareHomeworkCompletionDelivery.mockImplementationOnce(async () => { order.push('prepare'); });
    mockedDataStore.saveHomeworkItems.mockImplementationOnce(async () => { order.push('save'); });
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    await expect(result.current.toggleComplete('h1')).resolves.toMatchObject({ completed: true });
    expect(order).toEqual(['prepare', 'save']);
    const prepared = prepareHomeworkCompletionDelivery.mock.calls[0]![0];
    expect(prepared).toMatchObject({ id: 'h1', completed: true, completedDate: expect.any(Number) });
    await expect(result.current.toggleComplete('h1')).resolves.toMatchObject({ completed: false });
    expect(prepareHomeworkCompletionDelivery).toHaveBeenCalledTimes(1);
  });

  it('blocks source persistence on preparation failure and retries a source-save failure with the same completion fingerprint', async () => {
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'Old', dueDate: '2026-07-01', completed: false },
    ]);
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    prepareHomeworkCompletionDelivery.mockRejectedValueOnce(new Error('intent failed'));
    await expect(result.current.toggleComplete('h1')).rejects.toThrow('intent failed');
    expect(mockedDataStore.saveHomeworkItems).not.toHaveBeenCalled();
    prepareHomeworkCompletionDelivery.mockResolvedValue(undefined);
    mockedDataStore.saveHomeworkItems.mockRejectedValueOnce(new Error('source failed'));
    await expect(result.current.toggleComplete('h1')).rejects.toThrow('source failed');
    const first = prepareHomeworkCompletionDelivery.mock.calls.at(-1)![0];
    act(() => result.current.updateHomework('h1', { title: 'New' }));
    await expect(result.current.toggleComplete('h1')).resolves.toMatchObject({ completed: true, item: { title: 'New' } });
    const retry = prepareHomeworkCompletionDelivery.mock.calls.at(-1)![0];
    expect(retry.completedDate).toBe(first.completedDate);
    expect(mockedDataStore.saveHomeworkItems.mock.calls.at(-1)![0]).toEqual([
      expect.objectContaining({ id: 'h1', title: 'New', completed: true, completedDate: first.completedDate }),
    ]);
  });

  it('clears a failed completion retry candidate when the item is deleted', async () => {
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
    ]);
    mockedDataStore.saveHomeworkItems.mockRejectedValueOnce(new Error('source failed'));
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    await expect(result.current.toggleComplete('h1')).rejects.toThrow('source failed');
    act(() => result.current.deleteHomework('h1'));
    await expect(result.current.toggleComplete('h1')).resolves.toEqual({ completed: false });
    expect(result.current.homeworkItems).toEqual([]);
  });

  it('does not publish a completed item when the exact completion save fails', async () => {
    const { result } = renderHook(() => useHomework());
    act(() => {
      result.current.addHomework({ subject: 'Math', title: 'Fractions', dueDate: '2026-06-01' });
    });
    const id = result.current.homeworkItems[0]!.id;
    mockedDataStore.saveHomeworkItems.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(result.current.toggleComplete(id)).rejects.toThrow('storage unavailable');
    expect(result.current.homeworkItems[0]!.completed).toBe(false);
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

  it('persists an intentional final-item deletion without wiping an initially empty load', async () => {
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'only', subject: 'Math', title: 'Only', dueDate: '2026-07-01', completed: false },
    ]);
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    expect(mockedDataStore.saveHomeworkItems).not.toHaveBeenCalled();
    act(() => result.current.deleteHomework('only'));
    await vi.waitFor(() => expect(mockedDataStore.saveHomeworkItems).toHaveBeenLastCalledWith([]));
  });

  it('serializes a stale debounced snapshot before a toggled completion so the last durable write is complete', async () => {
    vi.useFakeTimers();
    try {
      let releaseOld!: () => void;
      mockedDataStore.saveHomeworkItems.mockImplementationOnce(
        async () =>
          new Promise<void>((resolve) => {
            releaseOld = resolve;
          }),
      );
      const { result } = renderHook(() => useHomework());
      await act(async () => {
        await Promise.resolve();
      });
      act(() =>
        result.current.addHomework({ subject: 'Math', title: 'Race', dueDate: '2026-07-01' }),
      );
      const id = result.current.homeworkItems[0]!.id;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledWith([
        expect.objectContaining({ id, completed: false }),
      ]);

      const toggle = result.current.toggleComplete(id);
      await act(async () => {
        releaseOld();
        await toggle;
      });
      expect(mockedDataStore.saveHomeworkItems.mock.calls.at(-1)?.[0]).toEqual([
        expect.objectContaining({ id, completed: true, completedDate: expect.any(Number) }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a debounce queued behind a blocked completion instead of overwriting it with stale state', async () => {
    vi.useFakeTimers();
    try {
      let releaseComplete!: () => void;
      const { result } = renderHook(() => useHomework());
      await act(async () => {
        await Promise.resolve();
      });
      act(() =>
        result.current.addHomework({
          subject: 'Math',
          title: 'Reverse race',
          dueDate: '2026-07-01',
        }),
      );
      const id = result.current.homeworkItems[0]!.id;
      mockedDataStore.saveHomeworkItems.mockImplementationOnce(
        async () =>
          new Promise<void>((resolve) => {
            releaseComplete = resolve;
          }),
      );
      const toggle = result.current.toggleComplete(id);
      await vi.waitFor(() =>
        expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledWith([
          expect.objectContaining({ id, completed: true }),
        ]),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
        releaseComplete();
        await toggle;
      });
      const completeDate = result.current.homeworkItems[0]!.completedDate;
      expect(
        mockedDataStore.saveHomeworkItems.mock.calls.every(
          ([items]) => (items as typeof result.current.homeworkItems)[0]?.completed !== false,
        ),
      ).toBe(true);
      expect(result.current.homeworkItems[0]).toEqual(
        expect.objectContaining({ completed: true, completedDate: completeDate }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('merges a released blocked toggle into a newer non-completion update', async () => {
    let release!: () => void;
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'Old', dueDate: '2026-07-01', completed: false },
    ]);
    mockedDataStore.saveHomeworkItems.mockImplementationOnce(
      async () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    const toggle = result.current.toggleComplete('h1');
    await vi.waitFor(() => expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalled());
    act(() => result.current.updateHomework('h1', { title: 'Newest' }));
    let toggleResult;
    await act(async () => {
      release();
      toggleResult = await toggle;
    });
    expect(toggleResult).toEqual(
      expect.objectContaining({ completed: true, item: result.current.homeworkItems[0] }),
    );
    expect(result.current.homeworkItems[0]).toEqual(
      expect.objectContaining({
        title: 'Newest',
        completed: true,
        completedDate: expect.any(Number),
      }),
    );
  });

  it('keeps and persists a newer update when the blocked toggle save fails', async () => {
    vi.useFakeTimers();
    try {
      let rejectOld!: (error: Error) => void;
      mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
        { id: 'h1', subject: 'Math', title: 'Old', dueDate: '2026-07-01', completed: false },
      ]);
      mockedDataStore.saveHomeworkItems.mockImplementationOnce(
        async () =>
          new Promise<void>((_, reject) => {
            rejectOld = reject;
          }),
      );
      const { result } = renderHook(() => useHomework());
      await act(async () => {
        await Promise.resolve();
      });
      const toggle = result.current.toggleComplete('h1');
      await vi.waitFor(() => expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalled());
      act(() => result.current.updateHomework('h1', { title: 'Newest' }));
      await act(async () => {
        rejectOld(new Error('write failed'));
        await expect(toggle).rejects.toThrow('write failed');
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(result.current.homeworkItems[0]).toEqual(
        expect.objectContaining({ title: 'Newest', completed: false }),
      );
      expect(mockedDataStore.saveHomeworkItems.mock.calls.at(-1)?.[0]).toEqual(
        result.current.homeworkItems,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('flushes the latest completed item on unmount behind a blocked toggle', async () => {
    let release!: () => void;
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
    ]);
    mockedDataStore.saveHomeworkItems.mockImplementationOnce(
      async () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { result, unmount } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    const toggle = result.current.toggleComplete('h1');
    await vi.waitFor(() => expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalled());
    unmount();
    await act(async () => {
      release();
      await toggle;
      await Promise.resolve();
    });
    expect(mockedDataStore.saveHomeworkItems.mock.calls.at(-1)?.[0]).toEqual([
      expect.objectContaining({ id: 'h1', completed: true, completedDate: expect.any(Number) }),
    ]);
  });

  it('rejects an overlapping toggle while one primary completion is in flight', async () => {
    let release!: () => void;
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
    ]);
    mockedDataStore.saveHomeworkItems.mockImplementationOnce(
      async () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    const first = result.current.toggleComplete('h1');
    const second = result.current.toggleComplete('h1');
    await expect(second).resolves.toEqual({ completed: false });
    await act(async () => {
      release();
    });
    await expect(first).resolves.toEqual(expect.objectContaining({ completed: true }));
    expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(1);
  });

  it('clears the toggle guard after a failed write so a later toggle can persist', async () => {
    mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
    ]);
    mockedDataStore.saveHomeworkItems
      .mockRejectedValueOnce(new Error('write failed'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useHomework());
    await vi.waitFor(() => expect(result.current.homeworkItems).toHaveLength(1));
    await expect(result.current.toggleComplete('h1')).rejects.toThrow('write failed');
    await expect(result.current.toggleComplete('h1')).resolves.toEqual(
      expect.objectContaining({ completed: true }),
    );
    expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(2);
  });

  it.each(['add', 'delete'] as const)(
    'keeps the newer %s durable after a blocked toggle releases',
    async (kind) => {
      vi.useFakeTimers();
      try {
        let release!: () => void;
        mockedDataStore.getHomeworkItems.mockResolvedValueOnce([
          { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
        ]);
        mockedDataStore.saveHomeworkItems.mockImplementationOnce(
          async () =>
            new Promise<void>((resolve) => {
              release = resolve;
            }),
        );
        const { result } = renderHook(() => useHomework());
        await act(async () => {
          await Promise.resolve();
        });
        const toggle = result.current.toggleComplete('h1');
        await vi.waitFor(() => expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalled());
        if (kind === 'add')
          act(() =>
            result.current.addHomework({ subject: 'Science', title: 'New', dueDate: '2026-07-02' }),
          );
        else act(() => result.current.deleteHomework('h1'));
        let toggleResult;
        await act(async () => {
          release();
          toggleResult = await toggle;
          await Promise.resolve();
          await vi.advanceTimersByTimeAsync(500);
        });
        expect(mockedDataStore.saveHomeworkItems.mock.calls.at(-1)?.[0]).toEqual(
          result.current.homeworkItems,
        );
        if (kind === 'add') {
          expect(toggleResult).toEqual(expect.objectContaining({ completed: true }));
          expect(result.current.homeworkItems).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: 'h1',
                completed: true,
                completedDate: expect.any(Number),
              }),
              expect.objectContaining({ title: 'New' }),
            ]),
          );
        } else {
          expect(toggleResult).toEqual({ completed: false });
          expect(result.current.homeworkItems).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 'h1' })]),
          );
        }
      } finally {
        vi.useRealTimers();
      }
    },
  );

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
    // Single shared gate (mirrors the real idempotent initialize) — the
    // debounced persist calls initialize() again, so a fresh-promise-per-call
    // mock would leave that second call hanging forever.
    const initGate = new Promise<void>((resolve) => {
      resolveInitialize = resolve;
    });
    mockedDataStore.initialize.mockReturnValue(initGate);

    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'Science', title: 'Atoms', dueDate: '2026-04-15' });
    });

    expect(mockedDataStore.saveHomeworkItems).not.toHaveBeenCalled();

    await act(async () => {
      resolveInitialize();
      await initGate;
    });

    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(1);
    });

    expect(mockedDataStore.initialize).toHaveBeenCalled();
  });

  it('preserves homework added before initialization finishes', async () => {
    let resolveInitialize!: () => void;
    const initGate = new Promise<void>((resolve) => {
      resolveInitialize = resolve;
    });
    mockedDataStore.initialize.mockReturnValue(initGate);
    mockedDataStore.getHomeworkItems.mockResolvedValue([]);

    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'Science', title: 'Atoms', dueDate: '2026-04-15' });
    });

    expect(result.current.homeworkItems).toHaveLength(1);

    await act(async () => {
      resolveInitialize();
      await initGate;
    });

    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(1);
    });

    expect(result.current.homeworkItems).toHaveLength(1);
    expect(result.current.homeworkItems[0]!.title).toBe('Atoms');
  });
});

describe('useHomework — debounced persistence (SVC-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDataStore.initialize.mockResolvedValue(undefined);
    mockedDataStore.getHomeworkItems.mockResolvedValue([]);
    mockedDataStore.saveHomeworkItems.mockResolvedValue(undefined);
  });

  it('collapses rapid edits into a single debounced save', async () => {
    const { result } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'm', title: 'one', dueDate: '2026-07-01' });
    });
    act(() => {
      result.current.addHomework({ subject: 'm', title: 'two', dueDate: '2026-07-01' });
    });
    act(() => {
      result.current.addHomework({ subject: 'm', title: 'three', dueDate: '2026-07-01' });
    });

    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalledTimes(1);
    });
    expect(mockedDataStore.saveHomeworkItems.mock.calls[0]![0]).toHaveLength(3);
  });

  it('flushes a pending write on unmount', async () => {
    const { result, unmount } = renderHook(() => useHomework());

    act(() => {
      result.current.addHomework({ subject: 'm', title: 'pending', dueDate: '2026-07-01' });
    });

    // Unmount before the debounce timer fires — the flush effect must persist.
    unmount();

    await vi.waitFor(() => {
      expect(mockedDataStore.saveHomeworkItems).toHaveBeenCalled();
    });
    expect(mockedDataStore.saveHomeworkItems.mock.calls.at(-1)![0]).toHaveLength(1);
  });
});
