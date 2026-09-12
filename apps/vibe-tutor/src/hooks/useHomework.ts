import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import { dataStore } from '../services/dataStore';
import { prepareHomeworkCompletionDelivery } from '../services/completionDeliveryService';
import type { HomeworkItem, ParsedHomework } from '../types';

const generateId = (): string => {
  const uuid = globalThis.crypto?.randomUUID;
  if (typeof uuid !== 'function') throw new Error('Secure homework identity is unavailable');
  return `homework:${uuid.call(globalThis.crypto)}`;
};

function mergeHomeworkItems(currentItems: HomeworkItem[], loadedItems: HomeworkItem[]) {
  if (currentItems.length === 0) {
    return loadedItems;
  }

  const currentIds = new Set(currentItems.map((item) => item.id));
  const persistedOnlyItems = loadedItems.filter((item) => !currentIds.has(item.id));
  return [...persistedOnlyItems, ...currentItems];
}

/**
 * Custom hook for managing homework items
 * Handles CRUD operations and persistence
 */
export const useHomework = () => {
  const [homeworkItems, setHomeworkItems] = useState<HomeworkItem[]>([]);
  const hasLoadedRef = useRef(false);

  // Load homework items from dataStore on mount
  useEffect(() => {
    let isCancelled = false;

    const loadHomework = async () => {
      try {
        await dataStore.initialize();
        const items = await dataStore.getHomeworkItems();
        if (!isCancelled) {
          setHomeworkItems((currentItems) => mergeHomeworkItems(currentItems, items));
          hasLoadedRef.current = true;
        }
      } catch (error) {
        logger.error('[useHomework] Failed to load homework items:', error);
      }
    };

    void loadHomework();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Keep a ref to the latest items so the unmount flush can persist them.
  const itemsRef = useRef(homeworkItems);
  itemsRef.current = homeworkItems;
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const mutationRef = useRef(Promise.resolve());
  const toggleInFlightRef = useRef(false);
  const completionRetryRef = useRef(new Map<string, number>());

  const persistHomework = useCallback(async (items: HomeworkItem[], revision: number) => {
    const job = mutationRef.current.then(async () => {
      if (revision !== revisionRef.current) return;
      await dataStore.initialize();
      await dataStore.saveHomeworkItems(items);
      if (revision === revisionRef.current) dirtyRef.current = false;
    });
    mutationRef.current = job.then(
      () => undefined,
      () => undefined,
    );
    try {
      await job;
    } catch (error) {
      logger.error(
        `[useHomework] Failed to save homework items: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, []);

  // Debounce persistence so rapid edits collapse into a single write.
  useEffect(() => {
    if (!hasLoadedRef.current || !dirtyRef.current) return;

    dirtyRef.current = true;
    const scheduledRevision = revisionRef.current;
    const timer = setTimeout(() => {
      void persistHomework(itemsRef.current, scheduledRevision);
    }, 500);

    return () => clearTimeout(timer);
  }, [homeworkItems, persistHomework]);

  // Flush any pending write on unmount so the last edit isn't lost.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        void mutationRef.current.then(async () => persistHomework(itemsRef.current, revisionRef.current));
      }
    };
  }, [persistHomework]);

  /**
   * Add a new homework item
   */
  const addHomework = (item: ParsedHomework): HomeworkItem => {
    const newItem: HomeworkItem = {
      ...item,
      id: generateId(),
      completed: false,
    };
    dirtyRef.current = true;
    revisionRef.current += 1;
    const next = [...itemsRef.current, newItem];
    itemsRef.current = next;
    setHomeworkItems(next);
    return newItem;
  };

  /**
   * Toggle homework item completion status
   * Returns true if item was just completed (for points/achievements)
   */
  const toggleComplete = async (id: string): Promise<{ completed: boolean; item?: HomeworkItem }> => {
    if (!itemsRef.current.some((item) => item.id === id))
      return Promise.resolve({ completed: false });
    if (toggleInFlightRef.current) return Promise.resolve({ completed: false });
    toggleInFlightRef.current = true;
    const toggleRevision = revisionRef.current + 1;
    revisionRef.current = toggleRevision;
    const job = mutationRef.current.then(async () => {
      const current = itemsRef.current;
      const found = current.find((item) => item.id === id);
      if (!found) return { completed: false };
      const retryCompletedDate = !found.completed ? completionRetryRef.current.get(id) : undefined;
      const nextItem: HomeworkItem = {
        ...found,
        completed: !found.completed,
        completedDate: !found.completed ? (retryCompletedDate ?? Date.now()) : undefined,
      };
      const next = current.map((item) => (item.id === id ? nextItem : item));
      if (nextItem.completed) await prepareHomeworkCompletionDelivery(nextItem);
      await dataStore.initialize();
      try {
        await dataStore.saveHomeworkItems(next);
      } catch (error) {
        if (nextItem.completed && nextItem.completedDate !== undefined)
          completionRetryRef.current.set(id, nextItem.completedDate);
        throw error;
      }
      completionRetryRef.current.delete(id);
      if (toggleRevision === revisionRef.current) {
        itemsRef.current = next;
        dirtyRef.current = false;
        setHomeworkItems(next);
        return { completed: nextItem.completed, item: nextItem };
      }
      const latest = itemsRef.current;
      const latestItem = latest.find((item) => item.id === id);
      if (!latestItem) return { completed: false };
      if (
        latestItem.completed !== found.completed ||
        latestItem.completedDate !== found.completedDate
      )
        return { completed: latestItem.completed, item: latestItem };
      const mergedItem = {
        ...latestItem,
        completed: nextItem.completed,
        completedDate: nextItem.completedDate,
      };
      const merged = latest.map((item) => (item.id === id ? mergedItem : item));
      revisionRef.current += 1;
      dirtyRef.current = true;
      itemsRef.current = merged;
      setHomeworkItems(merged);
      void persistHomework(merged, revisionRef.current);
      return { completed: mergedItem.completed, item: mergedItem };
    });
    const guarded = job.finally(() => {
      toggleInFlightRef.current = false;
    });
    mutationRef.current = guarded.then(
      () => undefined,
      () => undefined,
    );
    return guarded;
  };

  /**
   * Delete a homework item
   */
  const deleteHomework = (id: string): void => {
    completionRetryRef.current.delete(id);
    dirtyRef.current = true;
    revisionRef.current += 1;
    const next = itemsRef.current.filter((item) => item.id !== id);
    itemsRef.current = next;
    setHomeworkItems(next);
  };

  /**
   * Update a homework item
   */
  const updateHomework = (id: string, updates: Partial<HomeworkItem>): void => {
    dirtyRef.current = true;
    revisionRef.current += 1;
    const next = itemsRef.current.map((item) => (item.id === id ? { ...item, ...updates } : item));
    itemsRef.current = next;
    setHomeworkItems(next);
  };

  return {
    homeworkItems,
    addHomework,
    toggleComplete,
    deleteHomework,
    updateHomework,
  };
};
