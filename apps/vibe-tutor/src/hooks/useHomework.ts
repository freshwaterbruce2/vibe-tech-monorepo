import { useState, useEffect } from 'react';
import { dataStore } from '../services/dataStore';
import type { HomeworkItem, ParsedHomework } from '../types';

// Simple ID generator
const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Custom hook for managing homework items
 * Handles CRUD operations and persistence
 */
export const useHomework = () => {
  const [homeworkItems, setHomeworkItems] = useState<HomeworkItem[]>([]);

  // Load homework items from dataStore on mount
  useEffect(() => {
    const loadHomework = async () => {
      try {
        const items = await dataStore.getHomeworkItems();
        setHomeworkItems(items);
      } catch (error) {
        console.error('[useHomework] Failed to load homework items:', error);
      }
    };
    void loadHomework();
  }, []);

  // Persist homework items to dataStore whenever they change
  useEffect(() => {
    if (homeworkItems.length > 0) {
      dataStore.saveHomeworkItems(homeworkItems).catch(console.error);
    }
  }, [homeworkItems]);

  /**
   * Add a new homework item
   */
  const addHomework = (item: ParsedHomework): HomeworkItem => {
    const newItem: HomeworkItem = {
      ...item,
      id: generateId(),
      completed: false,
    };
    setHomeworkItems((prev) => [...prev, newItem]);
    return newItem;
  };

  /**
   * Toggle homework item completion status
   * Returns true if item was just completed (for points/achievements)
   */
  const toggleComplete = (id: string): boolean => {
    let wasJustCompleted = false;

    setHomeworkItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (!item.completed) {
            wasJustCompleted = true;
          }
          return {
            ...item,
            completed: !item.completed,
            completedDate: !item.completed ? Date.now() : undefined,
          };
        }
        return item;
      })
    );

    return wasJustCompleted;
  };

  /**
   * Delete a homework item
   */
  const deleteHomework = (id: string): void => {
    setHomeworkItems((prev) => prev.filter((item) => item.id !== id));
  };

  /**
   * Update a homework item
   */
  const updateHomework = (id: string, updates: Partial<HomeworkItem>): void => {
    setHomeworkItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  return {
    homeworkItems,
    addHomework,
    toggleComplete,
    deleteHomework,
    updateHomework,
  };
};
