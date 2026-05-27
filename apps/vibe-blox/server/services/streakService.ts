import type { Streak } from "../../src/types/index.js";
import { db } from "../db/index.js";

export class StreakService {
	/**
	 * Get or create streak record for a user and category
	 */
	static getStreak(userId: number, category: string): Streak | null {
		try {
			const stmt = db.prepare(`
        SELECT * FROM streaks
        WHERE user_id = ? AND category = ?
      `);
			return stmt.get(userId, category) as Streak | null;
		} catch (error) {
			console.error("Error getting streak:", error);
			return null;
		}
	}

	/**
	 * Get all streaks for a user
	 */
	static getAllStreaks(userId: number): Streak[] {
		try {
			const stmt = db.prepare(`
        SELECT * FROM streaks
        WHERE user_id = ?
        ORDER BY current_streak DESC
      `);
			return stmt.all(userId) as Streak[];
		} catch (error) {
			console.error("Error getting all streaks:", error);
			return [];
		}
	}

	/**
	 * Calculate streak multiplier based on current streak days
	 */
	static getStreakMultiplier(streakDays: number): number {
		if (streakDays >= 30) return 2.5;
		if (streakDays >= 14) return 2.0;
		if (streakDays >= 7) return 1.5;
		if (streakDays >= 3) return 1.25;
		return 1.0;
	}

	/**
	 * Get streak display emoji based on current streak
	 */
	static getStreakDisplay(streakDays: number): string {
		if (streakDays >= 30) return "💎";
		if (streakDays >= 14) return "🔥🔥";
		if (streakDays >= 7) return "🔥";
		if (streakDays >= 3) return "⚡";
		return "✨";
	}

	/**
	 * Update streak after quest completion
	 * Returns updated streak and whether it was incremented
	 */
	static updateStreak(
		userId: number,
		category: string,
	): { streak: Streak; incremented: boolean } {
		const today = new Date().toISOString().split("T")[0];
		let streak = StreakService.getStreak(userId, category);

		if (!streak) {
			// Create new streak record
			const stmt = db.prepare(`
        INSERT INTO streaks (user_id, category, current_streak, longest_streak, last_completed_date, updated_at)
        VALUES (?, ?, 1, 1, ?, datetime('now'))
      `);
			stmt.run(userId, category, today);
			streak = StreakService.getStreak(userId, category)!;
			return { streak, incremented: true };
		}

		const lastDate = streak.last_completed_date;
		let incremented = false;

		if (!lastDate) {
			// First completion
			const stmt = db.prepare(`
        UPDATE streaks
        SET current_streak = 1,
            longest_streak = CASE WHEN 1 > longest_streak THEN 1 ELSE longest_streak END,
            last_completed_date = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `);
			stmt.run(today, streak.id);
			incremented = true;
		} else if (lastDate === today) {
			// Already completed today, no streak change
			incremented = false;
		} else {
			// Check if streak continues or resets
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split("T")[0];

			if (lastDate === yesterdayStr) {
				// Streak continues!
				const newStreak = streak.current_streak + 1;
				const stmt = db.prepare(`
          UPDATE streaks
          SET current_streak = ?,
              longest_streak = CASE WHEN ? > longest_streak THEN ? ELSE longest_streak END,
              last_completed_date = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `);
				stmt.run(newStreak, newStreak, newStreak, today, streak.id);
				incremented = true;
			} else {
				// Streak broken, reset to 1
				const stmt = db.prepare(`
          UPDATE streaks
          SET current_streak = 1,
              last_completed_date = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `);
				stmt.run(today, streak.id);
				incremented = true;
			}
		}

		// Return updated streak
		streak = StreakService.getStreak(userId, category)!;
		return { streak, incremented };
	}

	/**
	 * Check all streaks for a user and reset any that are broken
	 * Should be called daily (e.g., at midnight)
	 */
	static checkAndResetStreaks(userId: number): void {
		const streaks = StreakService.getAllStreaks(userId);
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday.toISOString().slice(0, 10);

		for (const streak of streaks) {
			if (!streak.last_completed_date) continue;

			// If last completion was before yesterday, reset streak
			if (streak.last_completed_date < yesterdayStr) {
				const stmt = db.prepare(`
          UPDATE streaks
          SET current_streak = 0,
              updated_at = datetime('now')
          WHERE id = ?
        `);
				stmt.run(streak.id);
				console.log(
					`Reset streak for user ${userId}, category ${streak.category}`,
				);
			}
		}
	}

	/**
	 * Get the highest current streak for a user (for dashboard display)
	 */
	static getHighestStreak(userId: number): number {
		const streaks = StreakService.getAllStreaks(userId);
		if (streaks.length === 0) return 0;
		return Math.max(...streaks.map((s) => s.current_streak));
	}

	/**
	 * Get the longest streak ever achieved by a user
	 */
	static getLongestStreak(userId: number): number {
		const streaks = StreakService.getAllStreaks(userId);
		if (streaks.length === 0) return 0;
		return Math.max(...streaks.map((s) => s.longest_streak));
	}
}
