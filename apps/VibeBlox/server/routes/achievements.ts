import type { Context } from 'hono';
import { Hono } from 'hono';
import type { UserAchievement } from '../../src/types/index.js';
import { db } from '../db/index.js';
import { authMiddleware, type AuthEnv, type JWTPayload } from '../middleware/auth.js';
import { AchievementService } from '../services/achievementService.js';

const app = new Hono<AuthEnv>();

// All achievement routes require authentication
app.use('*', authMiddleware);

/**
 * GET /api/achievements
 * Fetch all achievements with unlock status for current user
 */
app.get('/', async (c: Context) => {
  try {
    const user = c.get('user') as JWTPayload;
    const achievements = AchievementService.getAchievementsWithStatus(user.userId);

    return c.json({
      success: true,
      achievements,
      total: achievements.length,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return c.json({ success: false, error: 'Failed to fetch achievements' }, 500);
  }
});

/**
 * GET /api/achievements/unlocked
 * Get only unlocked achievements for current user
 */
app.get('/unlocked', async (c: Context) => {
  try {
    const user = c.get('user') as JWTPayload;

    const stmt = db.prepare(`
      SELECT
        ua.*,
        a.name,
        a.description,
        a.icon,
        a.category,
        a.bonus_coins,
        a.rarity
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `);

    const unlocked = stmt.all(user.userId) as UserAchievement[];

    return c.json({
      success: true,
      unlocked,
      count: unlocked.length,
    });
  } catch (error) {
    console.error('Error fetching unlocked achievements:', error);
    return c.json({ success: false, error: 'Failed to fetch unlocked achievements' }, 500);
  }
});

/**
 * POST /api/achievements/check
 * Check for new achievement unlocks for current user
 * This should be called after quest completions, level ups, etc.
 */
app.post('/check', async (c: Context) => {
  try {
    const user = c.get('user') as JWTPayload;
    const newlyUnlocked = AchievementService.checkAndUnlock(user.userId);

    return c.json({
      success: true,
      newly_unlocked: newlyUnlocked,
      count: newlyUnlocked.length,
      message:
        newlyUnlocked.length > 0
          ? `Unlocked ${newlyUnlocked.length} new achievement${newlyUnlocked.length > 1 ? 's' : ''}!`
          : 'No new achievements unlocked',
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return c.json({ success: false, error: 'Failed to check achievements' }, 500);
  }
});

/**
 * GET /api/achievements/stats
 * Get achievement statistics for current user
 */
app.get('/stats', async (c: Context) => {
  try {
    const user = c.get('user') as JWTPayload;

    // Total achievements
    const totalStmt = db.prepare(`SELECT COUNT(*) as total FROM achievements WHERE is_active = 1`);
    const totalResult = totalStmt.get() as { total: number };

    // Unlocked count
    const unlockedStmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?
    `);
    const unlockedResult = unlockedStmt.get(user.userId) as { count: number };

    // By rarity
    const rarityStmt = db.prepare(`
      SELECT
        a.rarity,
        COUNT(*) as total,
        SUM(CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END) as unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      WHERE a.is_active = 1
      GROUP BY a.rarity
      ORDER BY
        CASE a.rarity
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'common' THEN 4
        END
    `);
    const byRarity = rarityStmt.all(user.userId);

    // Total bonus coins earned
    const coinsStmt = db.prepare(`
      SELECT SUM(a.bonus_coins) as total_bonus
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
    `);
    const coinsResult = coinsStmt.get(user.userId) as {
      total_bonus: number | null;
    };

    return c.json({
      success: true,
      stats: {
        total: totalResult.total,
        unlocked: unlockedResult.count,
        locked: totalResult.total - unlockedResult.count,
        completion_percentage: Math.round((unlockedResult.count / totalResult.total) * 100),
        by_rarity: byRarity,
        total_bonus_coins: coinsResult.total_bonus || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    return c.json({ success: false, error: 'Failed to fetch achievement stats' }, 500);
  }
});

export default app;
