import type { Context } from "hono";
import { Hono } from "hono";
import type { CompleteQuestRequest, Quest } from "../../src/types/index.js";
import { db } from "../db/index.js";
import {
	type AuthEnv,
	authMiddleware,
	type JWTPayload,
} from "../middleware/auth.js";
import { AchievementService } from "../services/achievementService.js";
import { StreakService } from "../services/streakService.js";

const app = new Hono<AuthEnv>();

// All quest routes require authentication
app.use("*", authMiddleware);

/**
 * GET /api/quests
 * Fetch all active quests
 */
app.get("/", async (c: Context) => {
	try {
		const stmt = db.prepare(`
      SELECT * FROM quests
      WHERE is_active = 1
      ORDER BY category, sort_order, name
    `);
		const quests = stmt.all() as Quest[];

		return c.json({
			success: true,
			quests,
			total: quests.length,
		});
	} catch (error) {
		console.error("Error fetching quests:", error);
		return c.json({ success: false, error: "Failed to fetch quests" }, 500);
	}
});

/**
 * GET /api/quests/:id
 * Get a specific quest by ID
 */
app.get("/:id", async (c: Context) => {
	try {
		const id = parseInt(c.req.param("id"));
		const stmt = db.prepare("SELECT * FROM quests WHERE id = ?");
		const quest = stmt.get(id) as Quest | undefined;

		if (!quest) {
			return c.json({ success: false, error: "Quest not found" }, 404);
		}

		return c.json({ success: true, quest });
	} catch (error) {
		console.error("Error fetching quest:", error);
		return c.json({ success: false, error: "Failed to fetch quest" }, 500);
	}
});

/**
 * POST /api/quests/complete
 * Child completes a quest (creates pending completion, awaits parent approval)
 */
app.post("/complete", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const body = await c.req.json<CompleteQuestRequest>();

		// Validate request
		if (!body.quest_id) {
			return c.json({ success: false, error: "Quest ID is required" }, 400);
		}

		// Get quest details
		const questStmt = db.prepare(
			"SELECT * FROM quests WHERE id = ? AND is_active = 1",
		);
		const quest = questStmt.get(body.quest_id) as Quest | undefined;

		if (!quest) {
			return c.json(
				{ success: false, error: "Quest not found or inactive" },
				404,
			);
		}

		// Calculate coins based on reminder status
		const baseCoins = body.without_reminder
			? quest.bonus_coins
			: quest.base_coins;

		// Get current streak for this category
		const streak = StreakService.getStreak(user.userId, quest.category);
		const currentStreak = streak?.current_streak || 0;
		const multiplier = StreakService.getStreakMultiplier(currentStreak);
		const finalCoins = Math.floor(baseCoins * multiplier);

		// Create quest completion record (pending approval)
		const insertStmt = db.prepare(`
      INSERT INTO quest_completions
        (user_id, quest_id, without_reminder, base_coins, multiplier, final_coins, notes, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

		const result = insertStmt.run(
			user.userId,
			body.quest_id,
			body.without_reminder ? 1 : 0,
			baseCoins,
			multiplier,
			finalCoins,
			body.notes || null,
		);

		// Get the created completion
		const completionStmt = db.prepare(`
      SELECT qc.*, q.name as quest_name, q.category, q.icon
      FROM quest_completions qc
      JOIN quests q ON qc.quest_id = q.id
      WHERE qc.id = ?
    `);
		const completion = completionStmt.get(result.lastInsertRowid);

		return c.json({
			success: true,
			message: "Quest completion submitted! Awaiting parent approval.",
			completion,
			coins_pending: finalCoins,
			multiplier,
			streak: currentStreak,
		});
	} catch (error) {
		console.error("Error completing quest:", error);
		return c.json({ success: false, error: "Failed to complete quest" }, 500);
	}
});

/**
 * GET /api/quests/pending
 * Get all pending quest completions (parent view)
 */
app.get("/pending", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;

		// Only parents can view pending approvals
		if (user.role !== "parent") {
			return c.json({ success: false, error: "Unauthorized" }, 403);
		}

		const stmt = db.prepare(`
      SELECT
        qc.*,
        q.name as quest_name,
        q.category,
        q.icon,
        u.display_name as user_name
      FROM quest_completions qc
      JOIN quests q ON qc.quest_id = q.id
      JOIN users u ON qc.user_id = u.id
      WHERE qc.awarded_by IS NULL
      ORDER BY qc.completed_at DESC
    `);

		const pending = stmt.all();

		return c.json({
			success: true,
			pending,
			count: pending.length,
		});
	} catch (error) {
		console.error("Error fetching pending quests:", error);
		return c.json(
			{ success: false, error: "Failed to fetch pending quests" },
			500,
		);
	}
});

/**
 * POST /api/quests/:id/approve
 * Parent approves or denies a quest completion
 */
app.post("/:id/approve", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const completionId = parseInt(c.req.param("id"));
		const body = await c.req.json<{ approved: boolean; notes?: string }>();

		// Only parents can approve
		if (user.role !== "parent") {
			return c.json({ success: false, error: "Unauthorized" }, 403);
		}

		// Get completion details
		const completionStmt = db.prepare(`
      SELECT qc.*, q.category, u.current_coins, u.lifetime_coins
      FROM quest_completions qc
      JOIN quests q ON qc.quest_id = q.id
      JOIN users u ON qc.user_id = u.id
      WHERE qc.id = ?
    `);
		const completion = completionStmt.get(completionId) as any;

		if (!completion) {
			return c.json({ success: false, error: "Completion not found" }, 404);
		}

		if (completion.awarded_by !== null) {
			return c.json({ success: false, error: "Already processed" }, 400);
		}

		if (body.approved) {
			// Award coins
			const newCurrentCoins = completion.current_coins + completion.final_coins;
			const newLifetimeCoins =
				completion.lifetime_coins + completion.final_coins;

			// Update user coins
			const userStmt = db.prepare(`
        UPDATE users
        SET current_coins = ?,
            lifetime_coins = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `);
			userStmt.run(newCurrentCoins, newLifetimeCoins, completion.user_id);

			// Update completion with approval
			const approveStmt = db.prepare(`
        UPDATE quest_completions
        SET awarded_by = ?
        WHERE id = ?
      `);
			approveStmt.run(user.userId, completionId);

			// Update streak
			const { streak, incremented } = StreakService.updateStreak(
				completion.user_id,
				completion.category,
			);

			// Add to activity feed
			const activityStmt = db.prepare(`
        INSERT INTO activity_feed
          (user_id, activity_type, title, description, coins_change, icon, created_at)
        VALUES (?, 'quest_complete', ?, ?, ?, ?, datetime('now'))
      `);
			activityStmt.run(
				completion.user_id,
				`Quest Completed!`,
				`You earned ${completion.final_coins} VibeCoins! ${incremented ? `Streak: ${streak.current_streak}` : ""}`,
				completion.final_coins,
				"✅",
			);

			// Update or create daily log
			const today = new Date().toISOString().split("T")[0];
			const logStmt = db.prepare(`
        INSERT INTO daily_logs (user_id, log_date, quests_completed, coins_earned, without_reminder_count)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(user_id, log_date) DO UPDATE SET
          quests_completed = quests_completed + 1,
          coins_earned = coins_earned + ?,
          without_reminder_count = without_reminder_count + ?
      `);
			logStmt.run(
				completion.user_id,
				today,
				completion.final_coins,
				completion.without_reminder ? 1 : 0,
				completion.final_coins,
				completion.without_reminder ? 1 : 0,
			);

			// Check for achievement unlocks
			const newAchievements = AchievementService.checkAndUnlock(
				completion.user_id,
			);

			return c.json({
				success: true,
				message: "Quest approved! Coins awarded.",
				coins_awarded: completion.final_coins,
				new_balance: newCurrentCoins,
				streak: streak.current_streak,
				streak_incremented: incremented,
				achievements_unlocked: newAchievements.length,
				new_achievements: newAchievements,
			});
		} else {
			// Denial
			const denyStmt = db.prepare(`
        UPDATE quest_completions
        SET awarded_by = ?,
            final_coins = 0,
            notes = ?
        WHERE id = ?
      `);
			denyStmt.run(user.userId, body.notes || "Denied by parent", completionId);

			return c.json({
				success: true,
				message: "Quest completion denied",
			});
		}
	} catch (error) {
		console.error("Error approving quest:", error);
		return c.json({ success: false, error: "Failed to process approval" }, 500);
	}
});

/**
 * GET /api/quests/history
 * Get quest completion history for the current user
 */
app.get("/history", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const limit = parseInt(c.req.query("limit") || "50");

		const stmt = db.prepare(`
      SELECT
        qc.*,
        q.name as quest_name,
        q.category,
        q.icon
      FROM quest_completions qc
      JOIN quests q ON qc.quest_id = q.id
      WHERE qc.user_id = ?
        AND qc.awarded_by IS NOT NULL
      ORDER BY qc.completed_at DESC
      LIMIT ?
    `);

		const history = stmt.all(user.userId, limit);

		return c.json({
			success: true,
			history,
			count: history.length,
		});
	} catch (error) {
		console.error("Error fetching quest history:", error);
		return c.json({ success: false, error: "Failed to fetch history" }, 500);
	}
});

/**
 * GET /api/quests/stats
 * Get quest completion stats for the current user
 */
app.get("/stats", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const today = new Date().toISOString().slice(0, 10);

		// Today's stats
		const todayStmt = db.prepare(`
      SELECT
        COUNT(*) as count,
        SUM(final_coins) as coins
      FROM quest_completions
      WHERE user_id = ?
        AND DATE(completed_at) = ?
        AND awarded_by IS NOT NULL
    `);
		const todayStats = todayStmt.get(user.userId, today) as any;

		// This week's stats
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		const weekAgoStr = weekAgo.toISOString().slice(0, 10);

		const weekStmt = db.prepare(`
      SELECT
        COUNT(*) as count,
        SUM(final_coins) as coins
      FROM quest_completions
      WHERE user_id = ?
        AND DATE(completed_at) >= ?
        AND awarded_by IS NOT NULL
    `);
		const weekStats = weekStmt.get(user.userId, weekAgoStr) as any;

		// Category breakdown
		const categoryStmt = db.prepare(`
      SELECT
        q.category,
        COUNT(*) as count,
        SUM(qc.final_coins) as coins
      FROM quest_completions qc
      JOIN quests q ON qc.quest_id = q.id
      WHERE qc.user_id = ?
        AND qc.awarded_by IS NOT NULL
      GROUP BY q.category
      ORDER BY count DESC
    `);
		const byCategory = categoryStmt.all(user.userId);

		// Streaks
		const highestStreak = StreakService.getHighestStreak(user.userId);
		const longestStreak = StreakService.getLongestStreak(user.userId);

		return c.json({
			success: true,
			stats: {
				today: {
					quests: todayStats.count || 0,
					coins: todayStats.coins || 0,
				},
				week: {
					quests: weekStats.count || 0,
					coins: weekStats.coins || 0,
				},
				byCategory,
				streaks: {
					current: highestStreak,
					longest: longestStreak,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching quest stats:", error);
		return c.json({ success: false, error: "Failed to fetch stats" }, 500);
	}
});

export default app;
