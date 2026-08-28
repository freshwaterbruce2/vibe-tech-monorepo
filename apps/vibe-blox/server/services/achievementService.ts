import type { Achievement, UserAchievement } from '../../src/types/index.js';
import { db } from '../db/index.js';

export class AchievementService {
  /**
   * Check and unlock achievements for a user
   * Returns newly unlocked achievements
   */
  static checkAndUnlock(userId: number): UserAchievement[] {
    const newlyUnlocked: UserAchievement[] = [];

    // Get all active achievements
    const achievementsStmt = db.prepare(`
      SELECT * FROM achievements
      WHERE is_active = 1
    `);
    const achievements = achievementsStmt.all() as Achievement[];

    // Get already unlocked achievement IDs
    const unlockedStmt = db.prepare(`
      SELECT achievement_id FROM user_achievements
      WHERE user_id = ?
    `);
    const unlocked = unlockedStmt.all(userId) as { achievement_id: number }[];
    const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));

    // Check each achievement
    for (const achievement of achievements) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) continue;

      // Check if requirement is met
      if (AchievementService.checkRequirement(userId, achievement)) {
        // Unlock achievement
        const insertStmt = db.prepare(`
          INSERT INTO user_achievements (user_id, achievement_id)
          VALUES (?, ?)
        `);
        const result = insertStmt.run(userId, achievement.id);

        // Award bonus coins if any
        if (achievement.bonus_coins > 0) {
          const userStmt = db.prepare(`
            UPDATE users
            SET current_coins = current_coins + ?,
                lifetime_coins = lifetime_coins + ?,
                updated_at = datetime('now')
            WHERE id = ?
          `);
          userStmt.run(achievement.bonus_coins, achievement.bonus_coins, userId);

          // Add to activity feed
          const activityStmt = db.prepare(`
            INSERT INTO activity_feed
              (user_id, activity_type, title, description, coins_change, icon, created_at)
            VALUES (?, 'achievement', ?, ?, ?, ?, datetime('now'))
          `);
          activityStmt.run(
            userId,
            `Achievement Unlocked!`,
            `${achievement.name} - Earned ${achievement.bonus_coins} bonus coins!`,
            achievement.bonus_coins,
            achievement.icon,
          );
        }

        // Get the created user achievement
        const userAchievementStmt = db.prepare(`
          SELECT ua.*, a.*
          FROM user_achievements ua
          JOIN achievements a ON ua.achievement_id = a.id
          WHERE ua.id = ?
        `);
        const userAchievement = userAchievementStmt.get(result.lastInsertRowid) as UserAchievement;
        newlyUnlocked.push(userAchievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check if a specific achievement requirement is met
   */
  private static checkRequirement(userId: number, achievement: Achievement): boolean {
    const { requirement_type, requirement_value, requirement_category } = achievement;

    switch (requirement_type) {
      case 'count': {
        // Count total quest completions (optionally filtered by category)
        let query = `
          SELECT COUNT(*) as count
          FROM quest_completions qc
          WHERE qc.user_id = ? AND qc.awarded_by IS NOT NULL
        `;
        const params: any[] = [userId];

        if (requirement_category) {
          query += ` AND qc.quest_id IN (SELECT id FROM quests WHERE category = ?)`;
          params.push(requirement_category);
        }

        const stmt = db.prepare(query);
        const result = stmt.get(...params) as { count: number };
        return result.count >= requirement_value;
      }

      case 'total_coins': {
        // Check lifetime coins
        const stmt = db.prepare(`SELECT lifetime_coins FROM users WHERE id = ?`);
        const user = stmt.get(userId) as { lifetime_coins: number };
        return user.lifetime_coins >= requirement_value;
      }

      case 'level': {
        // Check user level
        const stmt = db.prepare(`SELECT current_level FROM users WHERE id = ?`);
        const user = stmt.get(userId) as { current_level: number };
        return user.current_level >= requirement_value;
      }

      case 'streak': {
        // Check highest streak (optionally filtered by category)
        let query = `
          SELECT MAX(current_streak) as max_streak
          FROM streaks
          WHERE user_id = ?
        `;
        const params: any[] = [userId];

        if (requirement_category) {
          query += ` AND category = ?`;
          params.push(requirement_category);
        }

        const stmt = db.prepare(query);
        const result = stmt.get(...params) as { max_streak: number | null };
        return (result.max_streak || 0) >= requirement_value;
      }

      case 'custom':
        // Custom achievements would need specific logic
        return false;

      default:
        return false;
    }
  }

  /**
   * Get all achievements with unlock status for a user
   */
  static getAchievementsWithStatus(userId: number) {
    const stmt = db.prepare(`
      SELECT
        a.*,
        ua.id as user_achievement_id,
        ua.unlocked_at,
        CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      WHERE a.is_active = 1
      ORDER BY a.rarity DESC, a.category, a.name
    `);
    return stmt.all(userId);
  }
}
