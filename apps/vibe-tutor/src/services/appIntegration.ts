/**
 * App Integration Service
 * Connects database and learning analytics to the main application
 */

import { Capacitor } from '@capacitor/core';

import { logger } from '../utils/logger';
import type { Achievement, HomeworkItem, MusicPlaylist, Reward } from '../types';
import { databaseService } from './databaseService';
import { learningAnalytics } from './learningAnalytics';
import { migrationService } from './migrationService';

export interface UserStats {
  totalHomework: number;
  completedHomework: number;
  totalAchievements: number;
  unlockedAchievements: number;
  totalLearningTime: number;
  averageFocus: number;
}

export interface LearningRecommendationResult {
  patterns: unknown;
  recommendations: unknown;
}

import { appStore } from '../utils/electronStore';

export class AppIntegrationService {
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private dbAvailable = false;

  /**
   * Initialize all services and perform migration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = (async () => {
      try {
        // SQLite is only available on native platforms; on web the
        // jeep-sqlite WASM loader can hang the init chain when Vite
        // returns HTML for the .wasm request. Fall back to localStorage.
        const platform = Capacitor.getPlatform();
        const useSQLite = platform === 'android' || platform === 'windows';

        if (useSQLite) {
          await databaseService.initialize();
          this.dbAvailable = true;

          const migrated = await migrationService.isMigrationComplete();
          if (!migrated) {
            await migrationService.performMigration();
          }
        } else {
          this.dbAvailable = false;
        }

        await learningAnalytics.initialize();

        this.initialized = true;
      } catch (error) {
        logger.error('[AppIntegration] Initialization failed; using localStorage fallback:', error);
        this.dbAvailable = false;
        this.initialized = true;
      }
    })().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  }

  /**
   * Get homework items from database or localStorage
   */
  async getHomeworkItems(): Promise<HomeworkItem[]> {
    if (this.dbAvailable) {
      try {
        return await databaseService.getHomeworkItems();
      } catch (error) {
        logger.error('Database error, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    return appStore.get<HomeworkItem[]>('homeworkItems') ?? [];
  }

  /**
   * Save homework item to database and localStorage
   */
  async saveHomeworkItem(item: HomeworkItem): Promise<void> {
    // Always save to localStorage for backup
    const items = await this.getHomeworkItems();
    const index = items.findIndex((i) => i.id === item.id);

    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }

    appStore.set('homeworkItems', JSON.stringify(items));

    // Save to database if available
    if (this.dbAvailable) {
      try {
        await databaseService.saveHomeworkItem(item);
      } catch (error) {
        logger.error('Failed to save to database:', error);
      }
    }
  }

  /**
   * Delete homework item
   */
  async deleteHomeworkItem(id: string): Promise<void> {
    // Remove from localStorage
    const items = await this.getHomeworkItems();
    const filtered = items.filter((i) => i.id !== id);
    appStore.set('homeworkItems', JSON.stringify(filtered));

    // Remove from database if available
    if (this.dbAvailable) {
      try {
        const db = databaseService.getConnection();
        if (db) {
          await db.run('DELETE FROM homework_items WHERE id = ?', [id]);
        }
      } catch (error) {
        logger.error('Failed to delete from database:', error);
      }
    }
  }

  /**
   * Start a learning session
   */
  startLearningSession(
    activity: string,
    subject: string,
    difficulty: 'easy' | 'medium' | 'hard',
  ): void {
    learningAnalytics.startSession(activity, subject, difficulty);
  }

  /**
   * Update learning performance
   */
  updateLearningPerformance(correct: boolean): void {
    learningAnalytics.updatePerformance(correct);
  }

  /**
   * Update focus level
   */
  updateFocusLevel(isActive: boolean): void {
    learningAnalytics.updateFocusLevel(isActive);
  }

  /**
   * End learning session
   */
  async endLearningSession(completionRate: number): Promise<void> {
    await learningAnalytics.endSession(completionRate);
  }

  /**
   * Get learning recommendations
   */
  async getLearningRecommendations(): Promise<LearningRecommendationResult> {
    const patterns = await learningAnalytics.analyzeLearningPatterns();
    const recommendations = await learningAnalytics.generateRecommendations(patterns);
    return { patterns, recommendations };
  }

  /**
   * Get adaptive difficulty for a subject
   */
  async getAdaptiveDifficulty(subject: string): Promise<'easy' | 'medium' | 'hard'> {
    return await learningAnalytics.getAdaptiveDifficulty(subject);
  }

  /**
   * Track achievement unlock
   */
  async trackAchievement(achievement: Achievement): Promise<void> {
    if (this.dbAvailable) {
      try {
        await databaseService.updateAchievement(
          achievement.id,
          achievement.unlocked,
          achievement.progress ?? 0,
        );
      } catch (error) {
        logger.error('Failed to track achievement:', error);
      }
    }
  }

  /**
   * Get user stats
   */
  async getUserStats(): Promise<UserStats> {
    const stats = {
      totalHomework: 0,
      completedHomework: 0,
      totalAchievements: 0,
      unlockedAchievements: 0,
      totalLearningTime: 0,
      averageFocus: 0,
    };

    try {
      // Get homework stats
      const homework = await this.getHomeworkItems();
      stats.totalHomework = homework.length;
      stats.completedHomework = homework.filter((h) => h.completed).length;

      // Get achievement stats from localStorage
      const achievementData = appStore.get<Achievement[]>('achievements');
      if (achievementData) {
        stats.totalAchievements = achievementData.length;
        stats.unlockedAchievements = achievementData.filter((a: Achievement) => a.unlocked).length;
      }

      // Get learning stats from database
      if (this.dbAvailable) {
        const db = databaseService.getConnection();
        if (db) {
          const sessions = await db.query(`
            SELECT SUM(duration_minutes) as total_time,
                   AVG(focus_score) as avg_focus
            FROM learning_sessions
          `);

          if (sessions.values?.[0]) {
            stats.totalLearningTime = sessions.values[0].total_time ?? 0;
            stats.averageFocus = Math.round(sessions.values[0].avg_focus ?? 0);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get user stats:', error);
    }

    return stats;
  }

  /**
   * Export all data for backup
   */
  async exportData(): Promise<string> {
    const exportData = {
      timestamp: new Date().toISOString(),
      homework: await this.getHomeworkItems(),
      achievements: appStore.get<Achievement[]>('achievements') ?? [],
      rewards: appStore.get<Reward[]>('parentRewards') ?? [],
      playlists: appStore.get<MusicPlaylist[]>('musicPlaylists') ?? [],
      points: appStore.get('studentPoints') ?? '0',
      preferences: {
        sensory: appStore.get('sensory-prefs'),
        focus: appStore.get('focusSessions'),
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import data from backup
   */
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      // Import homework
      if (data.homework) {
        for (const item of data.homework) {
          await this.saveHomeworkItem(item);
        }
      }

      // Import other data to localStorage
      if (data.achievements) {
        appStore.set('achievements', JSON.stringify(data.achievements));
      }
      if (data.rewards) {
        appStore.set('parentRewards', JSON.stringify(data.rewards));
      }
      if (data.playlists) {
        appStore.set('musicPlaylists', JSON.stringify(data.playlists));
      }
      if (data.points) {
        appStore.set('studentPoints', data.points);
      }

    } catch (error) {
      logger.error('Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Check if database is available
   */
  isDatabaseAvailable(): boolean {
    return this.dbAvailable;
  }

  /**
   * Get database status
   */
  getDatabaseStatus(): string {
    if (this.dbAvailable) {
      return 'Connected to D:\\databases\\vibe-tutor\\';
    } else {
      return 'Using localStorage (database unavailable)';
    }
  }
}

// Export singleton instance
export const appIntegration = new AppIntegrationService();
