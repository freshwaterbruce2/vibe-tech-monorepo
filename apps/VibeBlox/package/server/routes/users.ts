import type { Context } from "hono";
import { Hono } from "hono";
import { db } from "../db/index.js";
import {
	type AuthEnv,
	authMiddleware,
	type JWTPayload,
} from "../middleware/auth.js";
import { StreakService } from "../services/streakService.js";

const app = new Hono<AuthEnv>();

// All user routes require authentication
app.use("*", authMiddleware);

/**
 * GET /api/users/stats
 * Get comprehensive user statistics for the dashboard
 */
app.get("/stats", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const today = new Date().toISOString().slice(0, 10);

		// Get user's current data
		const userStmt = db.prepare(`
      SELECT current_coins, lifetime_coins, current_level
      FROM users
      WHERE id = ?
    `);
		const userData = userStmt.get(user.userId) as any;

		if (!userData) {
			return c.json({ success: false, error: "User not found" }, 404);
		}

		// Today's quest completions
		const todayStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM quest_completions
      WHERE user_id = ?
        AND DATE(completed_at) = ?
        AND awarded_by IS NOT NULL
    `);
		const todayStats = todayStmt.get(user.userId, today) as any;

		// This week's quest completions
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const weekAgoStr = weekAgo.toISOString().slice(0, 10);

		const weekStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM quest_completions
      WHERE user_id = ?
        AND DATE(completed_at) >= ?
        AND awarded_by IS NOT NULL
    `);
		const weekStats = weekStmt.get(user.userId, weekAgoStr) as any;

		// Get badges count (achievements)
		const badgesStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM achievements
      WHERE user_id = ?
    `);
		const badgesStats = badgesStmt.get(user.userId) as any;

		// Total possible badges (count all achievement types)
		const totalBadgesStmt = db.prepare(`
      SELECT COUNT(DISTINCT category) as count
      FROM quests
      WHERE is_active = 1
    `);
		const totalBadgesStats = totalBadgesStmt.get() as any;

		// Get streak information
		const currentStreak = StreakService.getHighestStreak(user.userId);
		const longestStreak = StreakService.getLongestStreak(user.userId);

		return c.json({
			success: true,
			stats: {
				current_coins: userData.current_coins,
				lifetime_coins: userData.lifetime_coins,
				current_level: userData.current_level,
				quests_completed_today: todayStats.count || 0,
				quests_completed_week: weekStats.count || 0,
				badges_unlocked: badgesStats.count || 0,
				total_badges: (totalBadgesStats.count || 0) * 10, // Estimate: 10 badges per category
				current_streak: currentStreak,
				longest_streak: longestStreak,
			},
		});
	} catch (error) {
		console.error("Error fetching user stats:", error);
		return c.json({ success: false, error: "Failed to fetch user stats" }, 500);
	}
});

export default app;
