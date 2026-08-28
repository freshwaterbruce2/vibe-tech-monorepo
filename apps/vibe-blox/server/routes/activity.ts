import type { Context } from "hono";
import { Hono } from "hono";
import { db } from "../db/index.js";
import {
	type AuthEnv,
	authMiddleware,
	type JWTPayload,
} from "../middleware/auth.js";

const app = new Hono<AuthEnv>();

// All activity routes require authentication
app.use("*", authMiddleware);

/**
 * GET /api/activity
 * Fetch recent activity feed for current user
 */
app.get("/", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const limit = parseInt(c.req.query("limit") || "20");

		const stmt = db.prepare(`
      SELECT *
      FROM activity_feed
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

		const activities = stmt.all(user.userId, limit);

		return c.json({
			success: true,
			activities,
			count: activities.length,
		});
	} catch (error) {
		console.error("Error fetching activity feed:", error);
		return c.json(
			{ success: false, error: "Failed to fetch activity feed" },
			500,
		);
	}
});

/**
 * GET /api/activity/recent
 * Get recent activity summary (last 24 hours)
 */
app.get("/recent", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;

		const stmt = db.prepare(`
      SELECT *
      FROM activity_feed
      WHERE user_id = ?
        AND created_at >= datetime('now', '-24 hours')
      ORDER BY created_at DESC
    `);

		const activities = stmt.all(user.userId);

		return c.json({
			success: true,
			activities,
			count: activities.length,
		});
	} catch (error) {
		console.error("Error fetching recent activity:", error);
		return c.json(
			{ success: false, error: "Failed to fetch recent activity" },
			500,
		);
	}
});

/**
 * DELETE /api/activity/:id
 * Delete a specific activity (mark as read/dismissed)
 */
app.delete("/:id", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const idParam = c.req.param("id");
		if (!idParam) {
			return c.json({ success: false, error: "Activity ID is required" }, 400);
		}
		const activityId = parseInt(idParam);

		const stmt = db.prepare(`
      DELETE FROM activity_feed
      WHERE id = ? AND user_id = ?
    `);

		const result = stmt.run(activityId, user.userId);

		if (result.changes === 0) {
			return c.json({ success: false, error: "Activity not found" }, 404);
		}

		return c.json({
			success: true,
			message: "Activity deleted",
		});
	} catch (error) {
		console.error("Error deleting activity:", error);
		return c.json({ success: false, error: "Failed to delete activity" }, 500);
	}
});

/**
 * DELETE /api/activity
 * Clear all activity feed for current user
 */
app.delete("/", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;

		const stmt = db.prepare(`
      DELETE FROM activity_feed
      WHERE user_id = ?
    `);

		const result = stmt.run(user.userId);

		return c.json({
			success: true,
			message: "Activity feed cleared",
			deleted: result.changes,
		});
	} catch (error) {
		console.error("Error clearing activity feed:", error);
		return c.json(
			{ success: false, error: "Failed to clear activity feed" },
			500,
		);
	}
});

export default app;
