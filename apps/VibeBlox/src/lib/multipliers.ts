import { STREAK_MULTIPLIERS } from "../types";

export function getStreakMultiplier(streakDays: number): number {
	for (const tier of STREAK_MULTIPLIERS) {
		if (
			streakDays >= tier.min_days &&
			(tier.max_days === null || streakDays <= tier.max_days)
		) {
			return tier.multiplier;
		}
	}
	return 1.0;
}

export function getStreakDisplay(streakDays: number): string {
	for (const tier of STREAK_MULTIPLIERS) {
		if (
			streakDays >= tier.min_days &&
			(tier.max_days === null || streakDays <= tier.max_days)
		) {
			return tier.display;
		}
	}
	return "✨";
}

export function calculateCoins(
	baseCoins: number,
	withoutReminder: boolean,
	bonusCoins: number,
	streakDays: number,
): { base: number; multiplier: number; final: number } {
	// Step 1: Apply "without reminder" bonus
	const base = withoutReminder ? bonusCoins : baseCoins;

	// Step 2: Apply streak multiplier
	const multiplier = getStreakMultiplier(streakDays);
	const final = Math.floor(base * multiplier);

	return { base, multiplier, final };
}
