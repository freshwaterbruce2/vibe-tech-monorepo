/**
 * Services barrel export
 * Centralized exports for commonly used services
 */

export {
    ACHIEVEMENT_POINTS, checkAndUnlockAchievements, getAchievements, type AchievementEvent,
    type AchievementUnlockResult
} from './achievementService';
export { dataStore } from './dataStore';
export { databaseService } from './databaseService';
