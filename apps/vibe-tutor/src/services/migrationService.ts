/**
 * Migration Service for Vibe Tutor
 * Handles data migration from localStorage to SQLite database on D: drive
 */

import { databaseService } from './databaseService';
import type { HomeworkItem, Achievement, Reward, MusicPlaylist, ClaimedReward } from '../types';

import { appStore } from '../utils/electronStore';
import { logger } from '../utils/logger';

export class MigrationService {
  private migrationComplete = false;
  private migrationPromise: Promise<void> | null = null;
  private backupKey = 'vibe_tutor_migration_backup';

  private toStoredString(value: unknown, fallback: string): string {
    if (value === null || value === undefined) return fallback;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private parseStoredJson<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
      if (value.trim() === '') return fallback;
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    if (typeof value === 'object') {
      return value as T;
    }
    return fallback;
  }

  private parseStoredArray<T>(value: unknown): T[] {
    const parsed = this.parseStoredJson<unknown>(value, []);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  }

  /**
   * Check if migration has been completed
   */
  async isMigrationComplete(): Promise<boolean> {
    const migrationFlag = appStore.get<unknown>('vibe_tutor_migration_complete');
    return migrationFlag === 'true' || migrationFlag === true || this.migrationComplete;
  }

  /**
   * Create backup of all localStorage data before migration
   * CRITICAL: This must succeed before migration proceeds
   */
  private async createBackup(): Promise<void> {
    const backup: Record<string, string> = {
      timestamp: new Date().toISOString(),
      homeworkItems: this.toStoredString(appStore.get('homeworkItems'), '[]'),
      achievements: this.toStoredString(appStore.get('achievements'), '[]'),
      parentRewards: this.toStoredString(appStore.get('parentRewards'), '[]'),
      claimedRewards: this.toStoredString(appStore.get('claimedRewards'), '[]'),
      musicPlaylists: this.toStoredString(appStore.get('musicPlaylists'), '[]'),
      studentPoints: this.toStoredString(appStore.get('studentPoints'), '0'),
      userTokens: this.toStoredString(appStore.get('userTokens'), '0'),
      homeworkStats: this.toStoredString(appStore.get('homeworkStats'), '{}'),
      brainGamesStats: this.toStoredString(appStore.get('brainGamesStats'), '{}'),
      blake_daily_schedule: this.toStoredString(appStore.get('blake_daily_schedule'), '[]'),
      focusSessions: this.toStoredString(appStore.get('focusSessions'), '[]'),
      'chat-history-tutor': this.toStoredString(appStore.get('chat-history-tutor'), '[]'),
      'chat-history-friend': this.toStoredString(appStore.get('chat-history-friend'), '[]'),
      'sensory-prefs': this.toStoredString(appStore.get('sensory-prefs'), '{}')
    };

    try {
      appStore.set(this.backupKey, JSON.stringify(backup));
    } catch (error) {
      logger.error('[Migration] CRITICAL: Backup creation failed!', error);
      throw new Error('Failed to create backup. Migration aborted for safety.');
    }
  }

  /**
   * Restore data from backup (rollback capability)
   */
  async restoreFromBackup(): Promise<void> {
    const backupData = appStore.get(this.backupKey);
    if (!backupData) {
      throw new Error('No backup found. Cannot restore.');
    }

    try {
      let backup: Record<string, unknown>;
      if (typeof backupData === 'string') {
        backup = JSON.parse(backupData) as Record<string, unknown>;
      } else if (typeof backupData === 'object' && backupData !== null && !Array.isArray(backupData)) {
        backup = backupData as Record<string, unknown>;
      } else {
        throw new Error('Invalid backup format');
      }

      // Restore all data
      Object.entries(backup).forEach(([key, value]) => {
        if (key !== 'timestamp') {
          appStore.set(key, value);
        }
      });
    } catch (error) {
      logger.error('[Migration] Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Perform full data migration with backup and validation
   */
  async performMigration(): Promise<void> {
    if (await this.isMigrationComplete()) {
      return;
    }

    if (this.migrationPromise) {
      return this.migrationPromise;
    }

    this.migrationPromise = (async () => {
      try {
        // STEP 1: Create backup (CRITICAL - must succeed)
        await this.createBackup();

        // STEP 2: Initialize database
        await databaseService.initialize();

        // STEP 3: Migrate each data type
        await this.migrateHomeworkItems();

        await this.migrateAchievements();

        await this.migrateRewards();

        await this.migrateMusicPlaylists();

        await this.migrateUserProgress();

        await this.migrateLearningData();

        // STEP 4: Validate migration
        await this.validateMigration();

        // STEP 5: Mark migration as complete
        this.migrationComplete = true;
        appStore.set('vibe_tutor_migration_complete', 'true');
      } catch (error) {
        logger.error('[Migration] FAILED:', error);
        logger.error('[Migration] Your data is safe in the backup.');
        logger.error('[Migration] To restore, call: migrationService.restoreFromBackup()');
        throw error;
      }
    })().finally(() => {
      this.migrationPromise = null;
    });

    return this.migrationPromise;
  }

  /**
   * Validate migration by checking key data exists in database
   */
  private async validateMigration(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected for validation');

    // Check that tables exist and have data (if localStorage had data)
    const homeworkBackup = appStore.get('homeworkItems');
    const backupItems = this.parseStoredArray<HomeworkItem>(homeworkBackup);
    if (backupItems.length > 0) {
      const homework = await databaseService.getHomeworkItems();
      if (homework.length === 0) {
        throw new Error('Validation failed: Homework items not migrated');
      }
    }

  }

  /**
   * Migrate homework items
   */
  private async migrateHomeworkItems(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    const homeworkData = appStore.get('homeworkItems');
    if (!homeworkData) return;

    const items = this.parseStoredArray<HomeworkItem>(homeworkData);

    for (const item of items) {
      await databaseService.saveHomeworkItem(item);
    }
  }

  /**
   * Migrate achievements
   */
  private async migrateAchievements(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    const achievementsData = appStore.get('achievements');
    if (!achievementsData) return;

    const achievements = this.parseStoredArray<Achievement>(achievementsData);

    for (const achievement of achievements) {
      const query = `
        INSERT OR REPLACE INTO achievements
        (id, title, description, icon, unlocked, progress, progress_goal, points_awarded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.run(query, [
        achievement.id,
        achievement.title,
        achievement.description,
        achievement.icon,
        achievement.unlocked ? 1 : 0,
        achievement.progress ?? 0,
        achievement.progressGoal ?? 0,
        achievement.pointsAwarded ?? 0
      ]);
    }
  }

  /**
   * Migrate rewards
   */
  private async migrateRewards(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    const rewardsData = appStore.get('parentRewards');
    if (!rewardsData) return;

    const rewards = this.parseStoredArray<Reward>(rewardsData);

    for (const reward of rewards) {
      const query = `
        INSERT OR REPLACE INTO rewards
        (id, name, points_required, description, claimed)
        VALUES (?, ?, ?, ?, ?)
      `;

      await db.run(query, [
        reward.id,
        reward.name,
        reward.pointsRequired,
        reward.description ?? '',
        0
      ]);
    }

    // Also migrate claimed rewards
    const claimedData = appStore.get('claimedRewards');
    if (claimedData) {
      const claimed = this.parseStoredArray<ClaimedReward>(claimedData);
      for (const claimedReward of claimed) {
        await db.run(
          `UPDATE rewards SET claimed = 1, claimed_at = ? WHERE id = ?`,
          [claimedReward.claimedAt, claimedReward.id]
        );
      }
    }
  }

  /**
   * Migrate music playlists
   */
  private async migrateMusicPlaylists(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    const playlistsData = appStore.get('musicPlaylists');
    if (!playlistsData) return;

    const playlists = this.parseStoredArray<MusicPlaylist>(playlistsData);

    for (const playlist of playlists) {
      const query = `
        INSERT OR REPLACE INTO music_playlists
        (id, name, tracks)
        VALUES (?, ?, ?)
      `;

      await db.run(query, [
        playlist.id,
        playlist.name,
        JSON.stringify(playlist.tracks)
      ]);
    }
  }

  /**
   * Migrate user progress data
   */
  private async migrateUserProgress(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    // Ensure user_settings table exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Migrate student points
    const points = appStore.get('studentPoints');
    if (points) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['student_points', points]
      );
    }

    // Migrate user tokens
    const userTokens = appStore.get('userTokens');
    if (userTokens) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['user_tokens', userTokens]
      );
    }

    // Migrate homework stats
    const stats = appStore.get('homeworkStats');
    if (stats) {
      const statsData = this.parseStoredJson<Record<string, unknown>>(stats, {});
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['homework_stats', JSON.stringify(statsData)]
      );
    }

    // Migrate brain game stats
    const brainGameStats = appStore.get('brainGamesStats');
    if (brainGameStats) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['brainGamesStats', brainGameStats]
      );
    }

    // Migrate schedule data
    const scheduleData = appStore.get('blake_daily_schedule');
    if (scheduleData) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['blake_daily_schedule', scheduleData]
      );
    }

    const scheduleDate = appStore.get('blake_schedule_date');
    if (scheduleDate) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['blake_schedule_date', scheduleDate]
      );
    }

    // Migrate parental control settings (11 settings)
    const parentalSettings = [
      'firstThenEnabled',
      'firstThenSteps',
      'dailyCapEnabled',
      'dailyGameMinutes',
      'dailyTotalMinutes',
      'calmModeEnabled',
      'animationLevel',
      'soundsEnabled',
      'scheduleRequired',
      'firstThenGate',
      'parentalControlsEnabled'
    ];

    for (const settingKey of parentalSettings) {
      const value = appStore.get(settingKey);
      if (value !== null) {
        await db.run(
          `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
          [settingKey, value]
        );
      }
    }
  }

  /**
   * Migrate learning session data
   */
  private async migrateLearningData(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    // Ensure user_settings table exists for chat history
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Migrate focus sessions
    const focusSessions = appStore.get('focusSessions');
    if (focusSessions) {
      const sessions = this.parseStoredArray<{ duration?: number; points?: number }>(focusSessions);

      for (const session of sessions) {
        await db.run(`
          INSERT INTO learning_sessions
          (session_type, duration_minutes, focus_score, tasks_completed)
          VALUES (?, ?, ?, ?)
        `, // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- 0 duration is invalid
        ['focus', session.duration || 25, session.points ?? 0, 0]);
      }
    }

    // Migrate chat history (AI Tutor)
    const chatHistoryTutor = appStore.get('chat-history-tutor');
    if (chatHistoryTutor) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['chat-history-tutor', chatHistoryTutor]
      );
    }

    // Migrate chat history (AI Friend/Buddy)
    const chatHistoryFriend = appStore.get('chat-history-friend');
    if (chatHistoryFriend) {
      await db.run(
        `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
        ['chat-history-friend', chatHistoryFriend]
      );
    }

    // Migrate sensory preferences
    const sensoryPrefs = appStore.get('sensory-prefs');
    if (sensoryPrefs) {
      await db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      await db.run(
        `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`,
        ['sensory_prefs', sensoryPrefs]
      );
    }
  }

  /**
   * Export data for backup (reverse migration)
   */
  async exportToLocalStorage(): Promise<void> {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Database not connected');

    // Export homework items
    const homework = await databaseService.getHomeworkItems();
    appStore.set('homeworkItems', JSON.stringify(homework));

    // Export achievements
    const achievements = await db.query(`SELECT * FROM achievements`);
    if (achievements.values) {
      appStore.set('achievements', JSON.stringify(
        achievements.values.map((a: { unlocked?: number | boolean; [key: string]: unknown }) => ({
          ...a,
          unlocked: a.unlocked === 1
        }))
      ));
    }
  }

  /**
   * Clear localStorage after successful migration
   */
  async clearLocalStorage(keepSettings = true): Promise<void> {
    const keysToKeep = keepSettings ? [
      'vibe_tutor_migration_complete',
      'vibetutor_session',
      'vibetutor_expiry'
    ] : [];

    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        appStore.delete(key);
      }
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
