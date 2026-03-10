import bcrypt from "bcryptjs";
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
 * GET /api/users/me
 * Returns the current user's profile (no password_hash)
 */
app.get("/me", (c: Context) => {
	const user = c.get("user") as JWTPayload;

	const row = db
		.prepare(
			`SELECT id, username, display_name, role,
              current_coins, lifetime_coins, current_level, created_at
       FROM users WHERE id = ?`,
		)
		.get(user.userId) as
		| {
				id: number;
				username: string;
				display_name: string;
				role: string;
				current_coins: number;
				lifetime_coins: number;
				current_level: number;
				created_at: string;
		  }
		| undefined;

	if (!row) {
		return c.json({ success: false, error: "User not found" }, 404);
	}

	return c.json({ success: true, user: row });
});

/**
 * PATCH /api/users/profile
 * Update display_name and/or password.
 * Changing password requires current_password (verified via bcrypt).
 */
app.patch("/profile", async (c: Context) => {
	const user = c.get("user") as JWTPayload;

	let body: { display_name?: unknown; current_password?: unknown; new_password?: unknown };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ success: false, error: "Invalid JSON body" }, 400);
	}

	const { display_name, current_password, new_password } = body;

	// At least one update field required
	if (display_name === undefined && new_password === undefined) {
		return c.json(
			{ success: false, error: "Provide display_name or new_password to update" },
			400,
		);
	}

	// Validate display_name if present
	if (display_name !== undefined) {
		if (typeof display_name !== "string" || display_name.length < 1 || display_name.length > 50) {
			return c.json(
				{ success: false, error: "Display name must be 1-50 characters" },
				400,
			);
		}
	}

	// Validate new_password if present
	if (new_password !== undefined) {
		if (typeof new_password !== "string" || new_password.length < 8 || new_password.length > 72) {
			return c.json(
				{ success: false, error: "Password must be 8-72 characters" },
				400,
			);
		}
		// current_password required to change password
		if (!current_password || typeof current_password !== "string") {
			return c.json(
				{ success: false, error: "current_password is required to change password" },
				400,
			);
		}
		// Verify current password
		const row = db
			.prepare("SELECT password_hash FROM users WHERE id = ?")
			.get(user.userId) as { password_hash: string } | undefined;
		if (!row) {
			return c.json({ success: false, error: "User not found" }, 404);
		}
		const match = await bcrypt.compare(current_password, row.password_hash);
		if (!match) {
			return c.json({ success: false, error: "Current password is incorrect" }, 401);
		}
	}

	// Apply updates
	if (display_name !== undefined) {
		db.prepare("UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
			.run(display_name, user.userId);
	}
	if (new_password !== undefined && typeof new_password === "string") {
		const hash = await bcrypt.hash(new_password, 10);
		db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
			.run(hash, user.userId);
	}

	// Return updated profile
	const updated = db
		.prepare(
			`SELECT id, username, display_name, role,
              current_coins, lifetime_coins, current_level, created_at
       FROM users WHERE id = ?`,
		)
		.get(user.userId) as {
		id: number;
		username: string;
		display_name: string;
		role: string;
		current_coins: number;
		lifetime_coins: number;
		current_level: number;
		created_at: string;
	};

	return c.json({ success: true, user: updated });
});

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
