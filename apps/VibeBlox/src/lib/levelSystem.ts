import { LEVEL_THRESHOLDS, type LevelThreshold } from "../types";

export function getCurrentLevel(lifetimeCoins: number): number {
	for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
		const threshold = LEVEL_THRESHOLDS[i];
		if (threshold && lifetimeCoins >= threshold.cumulative) {
			return threshold.level;
		}
	}
	return 1;
}

export function getLevelInfo(level: number): LevelThreshold | undefined {
	return LEVEL_THRESHOLDS.find((l) => l.level === level);
}

export function getNextLevelInfo(currentLevel: number): LevelThreshold | null {
	return LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1) || null;
}

export function getProgressToNextLevel(lifetimeCoins: number): {
	currentLevel: number;
	nextLevel: number | null;
	currentTitle: string;
	nextTitle: string | null;
	coinsNeeded: number;
	progressPercent: number;
} {
	const currentLevel = getCurrentLevel(lifetimeCoins);
	const currentInfo = getLevelInfo(currentLevel) ?? LEVEL_THRESHOLDS[0];
	if (!currentInfo) {
		return {
			currentLevel: 1,
			nextLevel: null,
			currentTitle: "Level 1",
			nextTitle: null,
			coinsNeeded: 0,
			progressPercent: 100,
		};
	}
	const nextInfo = getNextLevelInfo(currentLevel);

	if (!nextInfo) {
		return {
			currentLevel,
			nextLevel: null,
			currentTitle: currentInfo.title,
			nextTitle: null,
			coinsNeeded: 0,
			progressPercent: 100,
		};
	}

	const coinsInCurrentLevel = lifetimeCoins - currentInfo.cumulative;
	const coinsNeeded = nextInfo.coins_required - coinsInCurrentLevel;
	const progressPercent = (coinsInCurrentLevel / nextInfo.coins_required) * 100;

	return {
		currentLevel,
		nextLevel: nextInfo.level,
		currentTitle: currentInfo.title,
		nextTitle: nextInfo.title,
		coinsNeeded,
		progressPercent: Math.min(100, Math.max(0, progressPercent)),
	};
}
