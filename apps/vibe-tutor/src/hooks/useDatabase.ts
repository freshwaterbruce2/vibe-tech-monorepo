/**
 * React hook for database and learning analytics integration
 */

import { useEffect, useState, useCallback } from 'react';
import { appIntegration, type UserStats } from '../services/appIntegration';
import type { HomeworkItem } from '../types';

export interface DatabaseStatus {
  isConnected: boolean;
  status: string;
  isInitializing: boolean;
}

export function useDatabase() {
  const [status, setStatus] = useState<DatabaseStatus>({
    isConnected: false,
    status: 'Initializing...',
    isInitializing: true
  });

  const [homeworkItems, setHomeworkItems] = useState<HomeworkItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Initialize database on mount
  useEffect(() => {
    const initDatabase = async () => {
      try {
        await appIntegration.initialize();

        setStatus({
          isConnected: appIntegration.isDatabaseAvailable(),
          status: appIntegration.getDatabaseStatus(),
          isInitializing: false
        });

        // Load initial data
        const items = await appIntegration.getHomeworkItems();
        setHomeworkItems(items);

        const userStats = await appIntegration.getUserStats();
        setStats(userStats);
      } catch (error) {
        console.error('Database initialization failed:', error);
        setStatus({
          isConnected: false,
          status: 'Database unavailable, using localStorage',
          isInitializing: false
        });
      }
    };

    void initDatabase();
  }, []);

  // Save homework item
  const saveHomework = useCallback(async (item: HomeworkItem) => {
    await appIntegration.saveHomeworkItem(item);
    const items = await appIntegration.getHomeworkItems();
    setHomeworkItems(items);
  }, []);

  // Delete homework item
  const deleteHomework = useCallback(async (id: string) => {
    await appIntegration.deleteHomeworkItem(id);
    const items = await appIntegration.getHomeworkItems();
    setHomeworkItems(items);
  }, []);

  // Toggle homework completion
  const toggleHomework = useCallback(async (id: string) => {
    const item = homeworkItems.find(h => h.id === id);
    if (item) {
      const updated = { ...item, completed: !item.completed };
      await saveHomework(updated);
    }
  }, [homeworkItems, saveHomework]);

  // Start learning session
  const startLearning = useCallback((
    activity: string,
    subject: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) => {
    appIntegration.startLearningSession(activity, subject, difficulty);
  }, []);

  // Update learning performance
  const updatePerformance = useCallback((correct: boolean) => {
    appIntegration.updateLearningPerformance(correct);
  }, []);

  // Update focus level
  const updateFocus = useCallback((isActive: boolean) => {
    appIntegration.updateFocusLevel(isActive);
  }, []);

  // End learning session
  const endLearning = useCallback(async (completionRate: number) => {
    await appIntegration.endLearningSession(completionRate);
    const userStats = await appIntegration.getUserStats();
    setStats(userStats);
  }, []);

  // Get recommendations
  const getRecommendations = useCallback(async () => {
    return await appIntegration.getLearningRecommendations();
  }, []);

  // Get adaptive difficulty
  const getAdaptiveDifficulty = useCallback(async (subject: string) => {
    return await appIntegration.getAdaptiveDifficulty(subject);
  }, []);

  // Export data
  const exportData = useCallback(async () => {
    return await appIntegration.exportData();
  }, []);

  // Import data
  const importData = useCallback(async (jsonData: string) => {
    await appIntegration.importData(jsonData);
    const items = await appIntegration.getHomeworkItems();
    setHomeworkItems(items);
    const userStats = await appIntegration.getUserStats();
    setStats(userStats);
  }, []);

  return {
    // Database status
    status,

    // Homework operations
    homeworkItems,
    saveHomework,
    deleteHomework,
    toggleHomework,

    // Learning operations
    startLearning,
    updatePerformance,
    updateFocus,
    endLearning,
    getRecommendations,
    getAdaptiveDifficulty,

    // Data operations
    exportData,
    importData,

    // Stats
    stats
  };
}