/**
 * Unified Data Store for Vibe Tutor
 * Provides single source of truth abstraction over SQLite and localStorage
 * Ensures MCP Learning Dashboard queries show correct real-time data
 */

import { logger } from '../utils/logger';
import { Capacitor } from '@capacitor/core';
import type {
  Achievement,
  BrainGameStats,
  ChatMessage,
  ClaimedReward,
  DailySchedule,
  FocusSession,
  HomeworkItem,
  MusicPlaylist,
  Reward,
  SensoryPreferences,
} from '../types';
import { databaseService } from './databaseService';
import { migrationService } from './migrationService';

import { appStore } from '../utils/electronStore';

function stringifyUserSetting(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getUserSettingFromStore(key: string): string {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.store?.get) {
      return stringifyUserSetting(window.electronAPI.store.get(key));
    }
  } catch {
    // Fall back to appStore below.
  }

  return stringifyUserSetting(appStore.get<unknown>(key));
}

export class DataStore {
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private useSQLite = false;

  constructor() {
    // Use SQLite on Android and Windows, localStorage on web
    const platform = Capacitor.getPlatform();
    this.useSQLite = platform === 'android' || platform === 'windows';
  }

  /**
   * Initialize database connection and perform migration if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = (async () => {
      try {
        if (this.useSQLite) {
          await databaseService.initialize();

          // Check if migration is needed
          const migrated = await migrationService.isMigrationComplete();
          if (!migrated) {
            await migrationService.performMigration();
          }
        }

        this.initialized = true;
      } catch (error) {
        logger.error('Failed to initialize data store:', error);
        // Fallback to localStorage
        this.useSQLite = false;
        this.initialized = true;
      }
    })().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  }

  // ========== Homework Items ==========

  async getHomeworkItems(): Promise<HomeworkItem[]> {
    if (this.useSQLite) {
      return await databaseService.getHomeworkItems();
    } else {
      return appStore.get<HomeworkItem[]>('homeworkItems') ?? [];
    }
  }

  async saveHomeworkItems(items: HomeworkItem[]): Promise<void> {
    if (this.useSQLite) {
      // Save each item to SQLite
      for (const item of items) {
        await databaseService.saveHomeworkItem(item);
      }
    } else {
      appStore.set('homeworkItems', JSON.stringify(items));
    }
  }

  async saveHomeworkItem(item: HomeworkItem): Promise<void> {
    if (this.useSQLite) {
      await databaseService.saveHomeworkItem(item);
    } else {
      const items = await this.getHomeworkItems();
      const index = items.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      appStore.set('homeworkItems', JSON.stringify(items));
    }
  }

  async deleteHomeworkItem(id: string): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run('DELETE FROM homework_items WHERE id = ?', [id]);
      }
    } else {
      const items = await this.getHomeworkItems();
      const filtered = items.filter((i) => i.id !== id);
      appStore.set('homeworkItems', JSON.stringify(filtered));
    }
  }

  // ========== Student Points ==========

  async getStudentPoints(): Promise<number> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(
          `SELECT value FROM user_settings WHERE key = 'student_points'`,
        );
        if (result.values && result.values.length > 0) {
          return Number(result.values[0].value);
        }
      }
      return 0;
    } else {
      return Number(appStore.get('studentPoints') ?? '0');
    }
  }

  async saveStudentPoints(points: number): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
          'student_points',
          points.toString(),
        ]);
      }
    } else {
      appStore.set('studentPoints', points.toString());
    }
  }

  // ========== Achievements ==========

  async getAchievements(): Promise<Achievement[]> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`
          SELECT id, title, description, icon, unlocked, progress,
                 progress_goal as progressGoal, points_awarded as pointsAwarded
          FROM achievements
        `);
        return result.values ?? [];
      }
      return [];
    } else {
      return appStore.get<Achievement[]>('achievements') ?? [];
    }
  }

  async saveAchievements(achievements: Achievement[]): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        for (const achievement of achievements) {
          await db.run(
            `
            INSERT OR REPLACE INTO achievements
            (id, title, description, icon, unlocked, progress, progress_goal, points_awarded)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              achievement.id,
              achievement.title,
              achievement.description,
              achievement.icon,
              achievement.unlocked ? 1 : 0,
              achievement.progress ?? 0,
              achievement.progressGoal ?? 0,
              achievement.pointsAwarded ?? 0,
            ],
          );
        }
      }
    } else {
      appStore.set('achievements', JSON.stringify(achievements));
    }
  }

  // ========== Rewards ==========

  async getRewards(): Promise<Reward[]> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`
          SELECT id, name, points_required as pointsRequired, description, claimed
          FROM rewards WHERE claimed = 0
        `);
        return result.values ?? [];
      }
      return [];
    } else {
      return appStore.get<Reward[]>('parentRewards') ?? [];
    }
  }

  async saveRewards(rewards: Reward[]): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        for (const reward of rewards) {
          await db.run(
            `
            INSERT OR REPLACE INTO rewards
            (id, name, points_required, description, claimed)
            VALUES (?, ?, ?, ?, ?)
          `,
            [reward.id, reward.name, reward.pointsRequired, reward.description ?? '', 0],
          );
        }
      }
    } else {
      appStore.set('parentRewards', JSON.stringify(rewards));
    }
  }

  async getClaimedRewards(): Promise<ClaimedReward[]> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`
          SELECT id, name, points_required as pointsRequired,
                 description, claimed_at as claimedAt
          FROM rewards WHERE claimed = 1
        `);
        return result.values ?? [];
      }
      return [];
    } else {
      return appStore.get<ClaimedReward[]>('claimedRewards') ?? [];
    }
  }

  async claimReward(rewardId: string): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`UPDATE rewards SET claimed = 1, claimed_at = ? WHERE id = ?`, [
          new Date().toISOString(),
          rewardId,
        ]);
      }
    } else {
      const rewards = await this.getRewards();
      const claimedRewards = await this.getClaimedRewards();
      const reward = rewards.find((r) => r.id === rewardId);
      if (reward) {
        const now = Date.now();
        claimedRewards.push({
          ...reward,
          claimedDate: now,
          claimedAt: new Date(now).toISOString(),
        });
        appStore.set('claimedRewards', JSON.stringify(claimedRewards));
      }
    }
  }

  // ========== Music Playlists ==========

  async getMusicPlaylists(): Promise<MusicPlaylist[]> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`SELECT id, name, tracks, created_at FROM music_playlists`);
        return (result.values ?? []).map(
          (p: { id: string; name: string; tracks: string | unknown[]; created_at?: number }) => ({
            id: p.id,
            name: p.name,
            platform: 'unknown',
            tracks:
              typeof p.tracks === 'string'
                ? JSON.parse(p.tracks)
                : Array.isArray(p.tracks)
                  ? p.tracks
                  : [],
            createdAt: p.created_at ?? Date.now(),
          }),
        );
      }
      return [];
    } else {
      return appStore.get<MusicPlaylist[]>('musicPlaylists') ?? [];
    }
  }

  async saveMusicPlaylists(playlists: MusicPlaylist[]): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        for (const playlist of playlists) {
          await db.run(
            `
            INSERT OR REPLACE INTO music_playlists (id, name, tracks)
            VALUES (?, ?, ?)
          `,
            [playlist.id, playlist.name, JSON.stringify(playlist.tracks)],
          );
        }
      }
    } else {
      appStore.set('musicPlaylists', JSON.stringify(playlists));
    }
  }

  // ========== Focus Sessions ==========

  async getFocusSessions(): Promise<FocusSession[]> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`
          SELECT duration_minutes as duration, focus_score as points,
                 session_date as completedAt
          FROM learning_sessions WHERE session_type = 'focus'
          ORDER BY session_date DESC
        `);
        return result.values ?? [];
      }
      return [];
    } else {
      return appStore.get<FocusSession[]>('focusSessions') ?? [];
    }
  }

  async saveFocusSession(session: FocusSession): Promise<void> {
    if (this.useSQLite) {
      await databaseService.recordLearningSession({
        type: 'focus',
        duration: session.duration ?? 25,
        focusScore: session.points ?? 0,
        tasksCompleted: 0,
      });
    } else {
      const sessions = await this.getFocusSessions();
      sessions.push(session);
      appStore.set('focusSessions', JSON.stringify(sessions));
    }
  }

  // ========== Avatar State ==========

  async getAvatarState(): Promise<import('../types').AvatarState | null> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`SELECT value FROM user_settings WHERE key = 'avatarState'`);
        if (result.values && result.values.length > 0) {
          return JSON.parse(result.values[0].value) as import('../types').AvatarState;
        }
      }
      return null;
    } else {
      return appStore.get<import('../types').AvatarState>('avatarState') ?? null;
    }
  }

  async saveAvatarState(state: import('../types').AvatarState): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
          'avatarState',
          JSON.stringify(state),
        ]);
      }
    } else {
      appStore.set('avatarState', JSON.stringify(state));
    }
  }

  // ========== Generic User Settings ==========

  async getUserSettings(key: string): Promise<string> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(`SELECT value FROM user_settings WHERE key = ?`, [key]);
        if (result.values && result.values.length > 0) {
          return result.values[0].value;
        }
      }
      return '';
    } else {
      return getUserSettingFromStore(key);
    }
  }

  async saveUserSettings(key: string, value: string): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
          key,
          value,
        ]);
      }
    } else {
      appStore.set(key, value);
    }
  }

  // ========== Chat History ==========

  async getChatHistory(type: 'tutor' | 'friend'): Promise<ChatMessage[]> {
    const key = `chat-history-${type}`;

    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        // Store chat history in user_settings as JSON
        const result = await db.query(`SELECT value FROM user_settings WHERE key = ?`, [key]);
        if (result.values && result.values.length > 0) {
          const messages = JSON.parse(result.values[0].value) as ChatMessage[];
          return messages;
        }
      }
      return [];
    } else {
      const messages = appStore.get<ChatMessage[]>(key) ?? [];
      return messages;
    }
  }

  async saveChatHistory(type: 'tutor' | 'friend', messages: ChatMessage[]): Promise<void> {
    const key = `chat-history-${type}`;

    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
          key,
          JSON.stringify(messages),
        ]);
      }
    } else {
      appStore.set(key, JSON.stringify(messages));
    }
  }

  // ========== Brain Game Stats ==========

  async getBrainGameStats(): Promise<BrainGameStats | null> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(
          `SELECT value FROM user_settings WHERE key = 'brainGamesStats'`,
        );
        if (result.values && result.values.length > 0) {
          return JSON.parse(result.values[0].value) as BrainGameStats;
        }
      }
      return null;
    } else {
      return appStore.get<BrainGameStats>('brainGamesStats');
    }
  }

  async saveBrainGameStats(stats: BrainGameStats): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
          'brainGamesStats',
          JSON.stringify(stats),
        ]);
      }
    } else {
      appStore.set('brainGamesStats', JSON.stringify(stats));
    }
  }

  // ========== Schedule ==========

  async getSchedule(): Promise<DailySchedule[]> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(
          `SELECT value FROM user_settings WHERE key = 'blake_daily_schedule'`,
        );
        if (result.values && result.values.length > 0) {
          return JSON.parse(result.values[0].value) as DailySchedule[];
        }
      }
      return [];
    } else {
      return appStore.get<DailySchedule[]>('blake_daily_schedule') ?? [];
    }
  }

  async saveSchedule(items: DailySchedule[]): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
          'blake_daily_schedule',
          JSON.stringify(items),
        ]);
      }
    } else {
      appStore.set('blake_daily_schedule', JSON.stringify(items));
    }
  }

  // ========== Sensory Preferences ==========

  async getSensoryPreferences(): Promise<SensoryPreferences | null> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        const result = await db.query(
          `SELECT value FROM user_preferences WHERE key = 'sensory_prefs'`,
        );
        if (result.values && result.values.length > 0) {
          return JSON.parse(result.values[0].value) as SensoryPreferences;
        }
      }
      return null;
    } else {
      return appStore.get<SensoryPreferences>('sensory-prefs');
    }
  }

  async saveSensoryPreferences(prefs: SensoryPreferences): Promise<void> {
    if (this.useSQLite) {
      const db = databaseService.getConnection();
      if (db) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        await db.run(`INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`, [
          'sensory_prefs',
          JSON.stringify(prefs),
        ]);
      }
    } else {
      appStore.set('sensory-prefs', JSON.stringify(prefs));
    }
  }
}

// Export singleton instance
export const dataStore = new DataStore();
