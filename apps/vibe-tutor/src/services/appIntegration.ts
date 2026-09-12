/** Coordinates the real app-local initialization dependencies used by App. */
import { Capacitor } from '@capacitor/core';

import { databaseService } from './databaseService';
import { dataStore } from './dataStore';
import { learningAnalytics } from './learningAnalytics';
import { initializeAchievements } from './achievementService';

export class AppIntegrationService {
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private dbAvailable = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = (async () => {
      try {
        const platform = Capacitor.getPlatform();
        const usesNativeDatabase = platform === 'android' || platform === 'windows';

        await dataStore.initialize();
        if (usesNativeDatabase) {
          if (databaseService.getConnection() === null) {
            throw new Error('Native SQLite storage is unavailable after initialization');
          }
          this.dbAvailable = true;
        } else {
          this.dbAvailable = false;
        }

        await initializeAchievements();
        await learningAnalytics.initialize();
        this.initialized = true;
      } catch (error) {
        this.dbAvailable = false;
        throw error;
      }
    })().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  }

  isDatabaseAvailable(): boolean {
    return this.dbAvailable;
  }
}

export const appIntegration = new AppIntegrationService();
