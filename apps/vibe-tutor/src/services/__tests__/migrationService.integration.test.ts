/**
 * Integration Tests for Migration Service
 * Tests backup, validation, rollback, and multi-platform behavior
 */

import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Achievement, LocalTrack, Reward } from '../../types';
import { appStore } from '../../utils/electronStore';
import { databaseService } from '../databaseService';
import { MigrationService } from '../migrationService';

// Mock dependencies
vi.mock('../../utils/electronStore', () => ({
  appStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../databaseService', () => ({
  databaseService: {
    initialize: vi.fn(),
    getConnection: vi.fn(),
    getHomeworkItems: vi.fn(),
    saveHomeworkItem: vi.fn(),
    saveRewards: vi.fn(),
    saveMusicPlaylists: vi.fn(),
  },
}));

describe('MigrationService - Integration Tests', () => {
  let service: MigrationService;

  // Test data fixtures
  const mockHomework = [
    {
      id: 'hw1',
      subject: 'Math',
      title: 'Algebra homework',
      dueDate: (Date.now() + 86400000) as unknown as string,
      completed: false,
      priority: 'high',
    },
    {
      id: 'hw2',
      subject: 'Science',
      title: 'Lab report',
      dueDate: (Date.now() + 172800000) as unknown as string,
      completed: true,
      priority: 'medium',
      completedDate: Date.now() - 3600000,
    },
  ];

  const mockAchievements = [
    {
      id: 'ach1',
      title: 'First Steps',
      description: 'Complete your first task',
      icon: '🌟' as unknown as Achievement['icon'],
      unlocked: true,
      progress: 1,
      progressGoal: 1,
      pointsAwarded: 10,
    },
    {
      id: 'ach2',
      title: 'Study Streak',
      description: 'Study 7 days in a row',
      icon: '🔥' as unknown as Achievement['icon'],
      unlocked: false,
      progress: 3,
      progressGoal: 7,
      pointsAwarded: 50,
    },
  ];

  const mockRewards: Reward[] = [
    {
      id: 'rw1',
      name: '15 min gaming',
      pointsRequired: 50,
      description: 'Extra 15 minutes of gaming time',
      cost: 50,
    },
    {
      id: 'rw2',
      name: 'Pick dinner',
      pointsRequired: 100,
      description: 'Choose what to have for dinner',
      cost: 100,
    },
  ];

  const mockPlaylists = [
    {
      id: 'pl1',
      name: 'Focus Music',
      tracks: [
        { id: 't1', title: 'Calm Piano', artist: 'Artist 1', duration: 240 } as unknown as LocalTrack,
        { id: 't2', title: 'Study Beats', artist: 'Artist 2', duration: 180 } as unknown as LocalTrack,
      ],
    },
  ];

  const mockDatabase = {
    run: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ values: [] }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MigrationService();

    // Default: Migration not complete
    vi.mocked(appStore.get).mockImplementation((key: string) => {
      if (key === 'vibe_tutor_migration_complete') return null;
      return null;
    });

    // Mock database connection
    vi.mocked(databaseService.getConnection).mockReturnValue(mockDatabase as unknown as SQLiteDBConnection);
    vi.mocked(databaseService.initialize).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Backup Creation', () => {
    it('creates backup with all localStorage data', async () => {
      let backupCreated = false;

      // Setup localStorage data
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        const data: Record<string, string> = {
          homeworkItems: JSON.stringify(mockHomework),
          achievements: JSON.stringify(mockAchievements),
          parentRewards: JSON.stringify(mockRewards),
          musicPlaylists: JSON.stringify(mockPlaylists),
          studentPoints: '150',
          userTokens: '25',
          'chat-history-tutor': JSON.stringify([{ role: 'user', content: 'Hello' }]),
        };
        return data[key] ?? null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      // Mock database to return migrated data for validation to pass
      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue(mockHomework);

      await service.performMigration();

      // Verify backup was created with timestamp
      const backupCall = vi
        .mocked(appStore.set)
        .mock.calls.find((call) => call[0] === 'vibe_tutor_migration_backup');

      expect(backupCall).toBeDefined();
      const backupData = JSON.parse((backupCall?.[1] as string) ?? '{}');

      expect(backupData).toHaveProperty('timestamp');
      expect(backupData.homeworkItems).toBe(JSON.stringify(mockHomework));
      expect(backupData.achievements).toBe(JSON.stringify(mockAchievements));
      expect(backupData.parentRewards).toBe(JSON.stringify(mockRewards));
      expect(backupData.musicPlaylists).toBe(JSON.stringify(mockPlaylists));
      expect(backupData.studentPoints).toBe('150');
      expect(backupData.userTokens).toBe('25');
    });

    it('handles empty localStorage gracefully', async () => {
      vi.mocked(appStore.get).mockReturnValue(null);
      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      const backupCall = vi
        .mocked(appStore.set)
        .mock.calls.find((call) => call[0] === 'vibe_tutor_migration_backup');

      expect(backupCall).toBeDefined();
      const backupData = JSON.parse((backupCall?.[1] as string) ?? '{}');

      // Should have empty arrays/objects as defaults
      expect(backupData.homeworkItems).toBe('[]');
      expect(backupData.achievements).toBe('[]');
      expect(backupData.studentPoints).toBe('0');
    });

    it('throws error and aborts if backup creation fails', async () => {
      // Setup: localStorage has data but backup creation fails
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') return null;
        if (key === 'homeworkItems') return JSON.stringify(mockHomework);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          throw new Error('Storage quota exceeded');
        }
      });

      await expect(service.performMigration()).rejects.toThrow(
        'Failed to create backup. Migration aborted for safety.',
      );

      // Verify database was not initialized (migration aborted)
      expect(databaseService.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Rollback Functionality', () => {
    it('restores all data from backup successfully', async () => {
      const backupData = {
        timestamp: new Date().toISOString(),
        homeworkItems: JSON.stringify(mockHomework),
        achievements: JSON.stringify(mockAchievements),
        parentRewards: JSON.stringify(mockRewards),
        studentPoints: '200',
        userTokens: '50',
      };

      vi.mocked(appStore.get).mockReturnValue(JSON.stringify(backupData));

      await service.restoreFromBackup();

      // Verify all keys were restored
      expect(appStore.set).toHaveBeenCalledWith('homeworkItems', backupData.homeworkItems);
      expect(appStore.set).toHaveBeenCalledWith('achievements', backupData.achievements);
      expect(appStore.set).toHaveBeenCalledWith('parentRewards', backupData.parentRewards);
      expect(appStore.set).toHaveBeenCalledWith('studentPoints', backupData.studentPoints);
      expect(appStore.set).toHaveBeenCalledWith('userTokens', backupData.userTokens);

      // Verify timestamp was not restored (metadata only)
      expect(appStore.set).not.toHaveBeenCalledWith('timestamp', expect.anything());
    });

    it('throws error when no backup exists', async () => {
      vi.mocked(appStore.get).mockReturnValue(null);

      await expect(service.restoreFromBackup()).rejects.toThrow('No backup found. Cannot restore.');
    });

    it('throws error when backup is corrupted', async () => {
      vi.mocked(appStore.get).mockReturnValue('{ invalid json');

      await expect(service.restoreFromBackup()).rejects.toThrow();
    });
  });

  describe('Validation Logic', () => {
    it('validates that homework data was migrated correctly', async () => {
      let backupCreated = false;

      // Setup: localStorage has homework data
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'homeworkItems') return JSON.stringify(mockHomework);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      // Setup: Database has the migrated homework
      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue(mockHomework);

      await service.performMigration();

      // Verify validation passed (no error thrown)
      expect(databaseService.getHomeworkItems).toHaveBeenCalled();
      expect(appStore.set).toHaveBeenCalledWith('vibe_tutor_migration_complete', 'true');
    });

    it('fails validation if homework not migrated', async () => {
      let backupCreated = false;

      // Setup: localStorage has homework data
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'homeworkItems') return JSON.stringify(mockHomework);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      // Setup: Database is empty (migration failed)
      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await expect(service.performMigration()).rejects.toThrow(
        'Validation failed: Homework items not migrated',
      );

      // Verify migration was not marked as complete
      expect(appStore.set).not.toHaveBeenCalledWith('vibe_tutor_migration_complete', 'true');
    });

    it('skips validation if localStorage was empty', async () => {
      let backupCreated = false;

      // Setup: No homework in localStorage
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'homeworkItems') return '[]';
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Validation should pass (nothing to validate)
      expect(appStore.set).toHaveBeenCalledWith('vibe_tutor_migration_complete', 'true');
    });

    it('throws error if database connection lost during validation', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'homeworkItems') return JSON.stringify(mockHomework);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      // Simulate database connection works during migration but lost during validation
      // Migration calls getConnection() 6 times (homework, achievements, rewards, playlists, userProgress, learningData)
      // Then validation calls it once more - that's when it should return null
      vi.mocked(databaseService.getConnection)
        .mockReturnValueOnce(mockDatabase as unknown as SQLiteDBConnection) // migrateHomeworkItems
        .mockReturnValueOnce(mockDatabase as unknown as SQLiteDBConnection) // migrateAchievements
        .mockReturnValueOnce(mockDatabase as unknown as SQLiteDBConnection) // migrateRewards
        .mockReturnValueOnce(mockDatabase as unknown as SQLiteDBConnection) // migrateMusicPlaylists
        .mockReturnValueOnce(mockDatabase as unknown as SQLiteDBConnection) // migrateUserProgress
        .mockReturnValueOnce(mockDatabase as unknown as SQLiteDBConnection) // migrateLearningData
        .mockReturnValue(null); // validateMigration (connection lost!)

      // Mock database method so migration steps can proceed
      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue(mockHomework);

      await expect(service.performMigration()).rejects.toThrow(
        'Database not connected for validation',
      );
    });
  });

  describe('Full Migration Workflow', () => {
    it('completes full migration successfully', async () => {
      let backupCreated = false;

      // Setup test data
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        const data: Record<string, string> = {
          homeworkItems: JSON.stringify(mockHomework),
          achievements: JSON.stringify(mockAchievements),
          parentRewards: JSON.stringify(mockRewards),
          musicPlaylists: JSON.stringify(mockPlaylists),
          studentPoints: '100',
          userTokens: '20',
        };
        return data[key] ?? null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue(mockHomework);

      await service.performMigration();

      // Verify migration steps executed in order
      expect(appStore.set).toHaveBeenCalledWith(
        'vibe_tutor_migration_backup',
        expect.stringContaining('timestamp'),
      );
      expect(databaseService.initialize).toHaveBeenCalled();
      expect(databaseService.saveHomeworkItem).toHaveBeenCalledTimes(mockHomework.length);
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO achievements'),
        expect.any(Array),
      );
      expect(appStore.set).toHaveBeenCalledWith('vibe_tutor_migration_complete', 'true');
    });

    it('skips migration if already completed', async () => {
      // Mark migration as complete
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_complete') return 'true';
        return null;
      });

      await service.performMigration();

      // Verify nothing was migrated
      expect(databaseService.initialize).not.toHaveBeenCalled();
      expect(appStore.set).not.toHaveBeenCalledWith(
        'vibe_tutor_migration_backup',
        expect.anything(),
      );
    });

    it('retains backup after successful migration', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Verify backup was created but not deleted
      expect(appStore.set).toHaveBeenCalledWith('vibe_tutor_migration_backup', expect.any(String));
      expect(appStore.delete).not.toHaveBeenCalledWith('vibe_tutor_migration_backup');
    });

    it('logs detailed error on migration failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(appStore.get).mockReturnValue(null);
      vi.mocked(databaseService.initialize).mockRejectedValue(
        new Error('Database initialization failed'),
      );

      await expect(service.performMigration()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] [Migration] FAILED:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] [Migration] Your data is safe in the backup.');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] [Migration] To restore, call: migrationService.restoreFromBackup()',
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Multi-Platform Storage Behavior', () => {
    it('migrates homework items with all fields preserved', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'homeworkItems') return JSON.stringify(mockHomework);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue(mockHomework);

      await service.performMigration();

      // Verify each homework item was saved
      for (const item of mockHomework) {
        expect(databaseService.saveHomeworkItem).toHaveBeenCalledWith(item);
      }
    });

    it('migrates achievements with correct boolean conversion', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'achievements') return JSON.stringify(mockAchievements);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Verify achievements were inserted with boolean -> int conversion
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO achievements'),
        [
          'ach1',
          'First Steps',
          'Complete your first task',
          '🌟',
          1, // unlocked: true -> 1
          1,
          1,
          10,
        ],
      );

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO achievements'),
        [
          'ach2',
          'Study Streak',
          'Study 7 days in a row',
          '🔥',
          0, // unlocked: false -> 0
          3,
          7,
          50,
        ],
      );
    });

    it('migrates rewards and claimed rewards correctly', async () => {
      const claimedRewards = [
        {
          ...mockRewards[0],
          claimedAt: (Date.now() - 86400000) as unknown as string,
          claimedDate: Date.now(),
        },
      ];

      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'parentRewards') return JSON.stringify(mockRewards);
        if (key === 'claimedRewards') return JSON.stringify(claimedRewards);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Verify rewards were inserted
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO rewards'),
        ['rw1', '15 min gaming', 50, 'Extra 15 minutes of gaming time', 0],
      );

      // Verify claimed reward was marked as claimed
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE rewards SET claimed = 1'),
        expect.arrayContaining([claimedRewards[0]!.claimedAt, 'rw1']),
      );
    });

    it('migrates music playlists with tracks as JSON', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'musicPlaylists') return JSON.stringify(mockPlaylists);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Verify playlist was inserted with tracks as JSON string
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO music_playlists'),
        ['pl1', 'Focus Music', JSON.stringify(mockPlaylists[0]!.tracks)],
      );
    });

    it('migrates user settings to key-value table', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) {
          return '{}';
        }
        const data: Record<string, string> = {
          studentPoints: '250',
          userTokens: '75',
          homeworkStats: JSON.stringify({ completed: 42, pending: 3 }),
          brainGamesStats: JSON.stringify({ highScore: 1000 }),
        };
        return data[key] ?? null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Verify user_settings table was created
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS user_settings'),
      );

      // Verify settings were inserted
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO user_settings'),
        ['student_points', '250'],
      );

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO user_settings'),
        ['user_tokens', '75'],
      );

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO user_settings'),
        ['homework_stats', JSON.stringify({ completed: 42, pending: 3 })],
      );
    });

    it('migrates learning data including focus sessions', async () => {
      const focusSessions = [
        { duration: 25, points: 25 },
        { duration: 50, points: 50 },
      ];

      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'focusSessions') return JSON.stringify(focusSessions);
        if (key === 'chat-history-tutor') return JSON.stringify([{ role: 'user', content: 'Hi' }]);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      await service.performMigration();

      // Verify focus sessions were inserted into learning_sessions table
      for (const session of focusSessions) {
        expect(mockDatabase.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO learning_sessions'),
          ['focus', session.duration, session.points, 0],
        );
      }

      // Verify chat history was stored in user_settings
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO user_settings'),
        ['chat-history-tutor', JSON.stringify([{ role: 'user', content: 'Hi' }])],
      );
    });
  });

  describe('Migration State Management', () => {
    it('checks migration complete flag from storage', async () => {
      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_complete') return 'true';
        return null;
      });

      const isComplete = await service.isMigrationComplete();

      expect(isComplete).toBe(true);
      expect(appStore.get).toHaveBeenCalledWith('vibe_tutor_migration_complete');
    });

    it('returns false when migration not complete', async () => {
      vi.mocked(appStore.get).mockReturnValue(null);

      const isComplete = await service.isMigrationComplete();

      expect(isComplete).toBe(false);
    });

    it('tracks migration state in memory', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.getHomeworkItems).mockResolvedValue([]);

      expect(await service.isMigrationComplete()).toBe(false);

      await service.performMigration();

      expect(await service.isMigrationComplete()).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('handles database initialization failure', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      vi.mocked(databaseService.initialize).mockRejectedValue(new Error('SQLite not available'));

      await expect(service.performMigration()).rejects.toThrow('SQLite not available');
    });

    it('handles invalid JSON in localStorage gracefully', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'homeworkItems') return '{ invalid json }';
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      await expect(service.performMigration()).resolves.toBeUndefined();
    });

    it('handles database query failure during migration', async () => {
      let backupCreated = false;

      vi.mocked(appStore.get).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup' && backupCreated) return '{}';
        if (key === 'achievements') return JSON.stringify(mockAchievements);
        return null;
      });

      vi.mocked(appStore.set).mockImplementation((key: string) => {
        if (key === 'vibe_tutor_migration_backup') {
          backupCreated = true;
        }
      });

      mockDatabase.run.mockRejectedValue(new Error('Database locked'));

      await expect(service.performMigration()).rejects.toThrow('Database locked');
    });
  });
});
