import type { Context } from "hono";
import { Hono } from "hono";
import type { PurchaseRewardRequest, Reward } from "../../src/types/index.js";
import { db } from "../db/index.js";
import {
	type AuthEnv,
	authMiddleware,
	type JWTPayload,
} from "../middleware/auth.js";

const app = new Hono<AuthEnv>();

// All reward routes require authentication
app.use("*", authMiddleware);

/**
 * GET /api/rewards
 * Fetch all active rewards
 */
app.get("/", async (c: Context) => {
	try {
		const stmt = db.prepare(`
      SELECT * FROM rewards
      WHERE is_active = 1
      ORDER BY category, rarity, cost, sort_order, name
    `);
		const rewards = stmt.all() as Reward[];

		return c.json({
			success: true,
			rewards,
			total: rewards.length,
		});
	} catch (error) {
		console.error("Error fetching rewards:", error);
		return c.json({ success: false, error: "Failed to fetch rewards" }, 500);
	}
});

/**
 * GET /api/rewards/:id
 * Get a specific reward by ID
 */
app.get("/:id", async (c: Context) => {
	try {
		const idParam = c.req.param("id");
		if (!idParam) {
			return c.json({ success: false, error: "Reward ID is required" }, 400);
		}
		const id = parseInt(idParam);
		const stmt = db.prepare("SELECT * FROM rewards WHERE id = ?");
		const reward = stmt.get(id) as Reward | undefined;

		if (!reward) {
			return c.json({ success: false, error: "Reward not found" }, 404);
		}

		return c.json({ success: true, reward });
	} catch (error) {
		console.error("Error fetching reward:", error);
		return c.json({ success: false, error: "Failed to fetch reward" }, 500);
	}
});

/**
 * POST /api/rewards/purchase
 * Child purchases a reward (creates pending purchase, awaits parent approval)
 */
app.post("/purchase", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const body = await c.req.json<PurchaseRewardRequest>();

		// Validate request
		if (!body.reward_id) {
			return c.json({ success: false, error: "Reward ID is required" }, 400);
		}

		// Get reward details
		const rewardStmt = db.prepare(
			"SELECT * FROM rewards WHERE id = ? AND is_active = 1",
		);
		const reward = rewardStmt.get(body.reward_id) as Reward | undefined;

		if (!reward) {
			return c.json(
				{ success: false, error: "Reward not found or inactive" },
				404,
			);
		}

		// Get user's current coins
		const userStmt = db.prepare("SELECT current_coins FROM users WHERE id = ?");
		const userCoins = userStmt.get(user.userId) as { current_coins: number };

		// Check if user has enough coins
		if (userCoins.current_coins < reward.cost) {
			return c.json(
				{
					success: false,
					error: "Insufficient VibeCoins",
					required: reward.cost,
					current: userCoins.current_coins,
					shortfall: reward.cost - userCoins.current_coins,
				},
				400,
			);
		}

		// Create purchase record (pending approval)
		const insertStmt = db.prepare(`
      INSERT INTO purchases
        (user_id, reward_id, cost, status, purchased_at)
      VALUES (?, ?, ?, 'pending', datetime('now'))
    `);

		const result = insertStmt.run(user.userId, body.reward_id, reward.cost);

		// Get the created purchase
		const purchaseStmt = db.prepare(`
      SELECT p.*, r.name as reward_name, r.category, r.icon, r.rarity
      FROM purchases p
      JOIN rewards r ON p.reward_id = r.id
      WHERE p.id = ?
    `);
		const purchase = purchaseStmt.get(result.lastInsertRowid);

		return c.json({
			success: true,
			message: "Purchase submitted! Awaiting parent approval.",
			purchase,
			pending_cost: reward.cost,
		});
	} catch (error) {
		console.error("Error purchasing reward:", error);
		return c.json({ success: false, error: "Failed to purchase reward" }, 500);
	}
});

/**
 * GET /api/rewards/pending
 * Get all pending purchases (parent view)
 */
app.get("/pending", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;

		// Only parents can view pending purchases
		if (user.role !== "parent") {
			return c.json({ success: false, error: "Unauthorized" }, 403);
		}

		const stmt = db.prepare(`
      SELECT
        p.*,
        r.name as reward_name,
        r.category,
        r.icon,
        r.rarity,
        r.real_value,
        u.display_name as user_name
      FROM purchases p
      JOIN rewards r ON p.reward_id = r.id
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.purchased_at DESC
    `);

		const pending = stmt.all();

		return c.json({
			success: true,
			pending,
			count: pending.length,
		});
	} catch (error) {
		console.error("Error fetching pending purchases:", error);
		return c.json(
			{ success: false, error: "Failed to fetch pending purchases" },
			500,
		);
	}
});

/**
 * POST /api/rewards/:id/approve
 * Parent approves or denies a purchase
 */
app.post("/:id/approve", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const purchaseIdParam = c.req.param("id");
		if (!purchaseIdParam) {
			return c.json({ success: false, error: "Purchase ID is required" }, 400);
		}
		const purchaseId = parseInt(purchaseIdParam);
		const body = await c.req.json<{ approved: boolean; notes?: string }>();

		// Only parents can approve
		if (user.role !== "parent") {
			return c.json({ success: false, error: "Unauthorized" }, 403);
		}

		// Get purchase details
		const purchaseStmt = db.prepare(`
      SELECT p.*, u.current_coins, r.name as reward_name
      FROM purchases p
      JOIN users u ON p.user_id = u.id
      JOIN rewards r ON p.reward_id = r.id
      WHERE p.id = ?
    `);
		const purchase = purchaseStmt.get(purchaseId) as any;

		if (!purchase) {
			return c.json({ success: false, error: "Purchase not found" }, 404);
		}

		if (purchase.status !== "pending") {
			return c.json(
				{ success: false, error: "Purchase already processed" },
				400,
			);
		}

		if (body.approved) {
			// Check if user still has enough coins
			if (purchase.current_coins < purchase.cost) {
				return c.json(
					{
						success: false,
						error: "User no longer has enough coins",
						required: purchase.cost,
						current: purchase.current_coins,
					},
					400,
				);
			}

			// Deduct coins
			const newBalance = purchase.current_coins - purchase.cost;
			const userStmt = db.prepare(`
        UPDATE users
        SET current_coins = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `);
			userStmt.run(newBalance, purchase.user_id);

			// Update purchase status
			const approveStmt = db.prepare(`
        UPDATE purchases
        SET status = 'approved',
            approved_by = ?,
            approved_at = datetime('now'),
            notes = ?
        WHERE id = ?
      `);
			approveStmt.run(user.userId, body.notes || null, purchaseId);

			// Add to activity feed
			const activityStmt = db.prepare(`
        INSERT INTO activity_feed
          (user_id, activity_type, title, description, coins_change, icon, created_at)
        VALUES (?, 'purchase', ?, ?, ?, ?, datetime('now'))
      `);
			activityStmt.run(
				purchase.user_id,
				"Purchase Approved!",
				`You got: ${purchase.reward_name}`,
				-purchase.cost,
				"🎁",
			);

			return c.json({
				success: true,
				message: "Purchase approved! Coins deducted.",
				coins_spent: purchase.cost,
				new_balance: newBalance,
			});
		} else {
			// Denial - no coin deduction
			const denyStmt = db.prepare(`
        UPDATE purchases
        SET status = 'denied',
            approved_by = ?,
            approved_at = datetime('now'),
            notes = ?
        WHERE id = ?
      `);
			denyStmt.run(user.userId, body.notes || "Denied by parent", purchaseId);

			return c.json({
				success: true,
				message: "Purchase denied. Coins not deducted.",
			});
		}
	} catch (error) {
		console.error("Error approving purchase:", error);
		return c.json({ success: false, error: "Failed to process approval" }, 500);
	}
});

/**
 * POST /api/rewards/:id/fulfill
 * Parent marks purchase as fulfilled (physically given the reward)
 */
app.post("/:id/fulfill", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const purchaseIdParam = c.req.param("id");
		if (!purchaseIdParam) {
			return c.json({ success: false, error: "Purchase ID is required" }, 400);
		}
		const purchaseId = parseInt(purchaseIdParam);

		// Only parents can fulfill
		if (user.role !== "parent") {
			return c.json({ success: false, error: "Unauthorized" }, 403);
		}

		// Update purchase status
		const stmt = db.prepare(`
      UPDATE purchases
      SET status = 'fulfilled',
          fulfilled_at = datetime('now')
      WHERE id = ? AND status = 'approved'
    `);

		const result = stmt.run(purchaseId);

		if (result.changes === 0) {
			return c.json(
				{ success: false, error: "Purchase not found or not approved" },
				404,
			);
		}

		return c.json({
			success: true,
			message: "Purchase marked as fulfilled",
		});
	} catch (error) {
		console.error("Error fulfilling purchase:", error);
		return c.json({ success: false, error: "Failed to fulfill purchase" }, 500);
	}
});

/**
 * GET /api/rewards/history
 * Get purchase history for the current user
 */
app.get("/history", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;
		const limit = parseInt(c.req.query("limit") || "50");

		const stmt = db.prepare(`
      SELECT
        p.*,
        r.name as reward_name,
        r.category,
        r.icon,
        r.rarity
      FROM purchases p
      JOIN rewards r ON p.reward_id = r.id
      WHERE p.user_id = ?
        AND p.status != 'pending'
      ORDER BY p.purchased_at DESC
      LIMIT ?
    `);

		const history = stmt.all(user.userId, limit);

		return c.json({
			success: true,
			history,
			count: history.length,
		});
	} catch (error) {
		console.error("Error fetching purchase history:", error);
		return c.json({ success: false, error: "Failed to fetch history" }, 500);
	}
});

/**
 * GET /api/rewards/stats
 * Get purchase statistics for the current user
 */
app.get("/stats", async (c: Context) => {
	try {
		const user = c.get("user") as JWTPayload;

		// Total spent
		const totalStmt = db.prepare(`
      SELECT SUM(cost) as total
      FROM purchases
      WHERE user_id = ?
        AND status IN ('approved', 'fulfilled')
    `);
		const totalStats = totalStmt.get(user.userId) as any;

		// Category breakdown
		const categoryStmt = db.prepare(`
      SELECT
        r.category,
        COUNT(*) as count,
        SUM(p.cost) as total_cost
      FROM purchases p
      JOIN rewards r ON p.reward_id = r.id
      WHERE p.user_id = ?
        AND p.status IN ('approved', 'fulfilled')
      GROUP BY r.category
      ORDER BY count DESC
    `);
		const byCategory = categoryStmt.all(user.userId);

		// Pending purchases
		const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count, SUM(cost) as total
      FROM purchases
      WHERE user_id = ? AND status = 'pending'
    `);
		const pendingStats = pendingStmt.get(user.userId) as any;

		return c.json({
			success: true,
			stats: {
				total_spent: totalStats.total || 0,
				total_purchases: byCategory.reduce(
					(sum: number, cat: any) => sum + cat.count,
					0,
				),
				pending_purchases: pendingStats.count || 0,
				pending_value: pendingStats.total || 0,
				byCategory,
			},
		});
	} catch (error) {
		console.error("Error fetching purchase stats:", error);
		return c.json({ success: false, error: "Failed to fetch stats" }, 500);
	}
});

export default app;
