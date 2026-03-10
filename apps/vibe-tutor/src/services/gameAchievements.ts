import { appStore } from '../utils/electronStore';

/**
 * Game Achievement System - Roblox Style
 *
 * Badges, levels, and progression like Roblox games.
 * Makes learning feel like unlocking achievements in his favorite game.
 */

export interface GameBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: number;
  progress?: number;
  requirement?: number;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalGamesPlayed: number;
  totalWordsFound: number;
  fastestTime: number;
  highestScore: number;
  badges: GameBadge[];
  streak: number;
  lastPlayed: string;
}

// Roblox-style badge definitions
const WORD_HUNT_BADGES: GameBadge[] = [
  {
    id: 'first-word',
    name: 'Word Finder',
    description: 'Found your first word!',
    icon: '🔍',
    rarity: 'common',
    requirement: 1,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a game in under 2 minutes',
    icon: '⚡',
    rarity: 'rare',
  },
  {
    id: 'no-hints-hero',
    name: 'No Hints Hero',
    description: 'Complete a game without using hints',
    icon: '🎯',
    rarity: 'rare',
  },
  {
    id: 'perfect-game',
    name: 'Perfect Game',
    description: 'Find all words with no hints and under 3 minutes',
    icon: '💎',
    rarity: 'epic',
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Play 7 days in a row',
    icon: '🔥',
    rarity: 'epic',
  },
  {
    id: 'word-hunter',
    name: 'Word Hunter',
    description: 'Find 100 total words',
    icon: '🏆',
    rarity: 'rare',
    requirement: 100,
  },
  {
    id: 'math-master',
    name: 'Math Master',
    description: 'Complete 10 math word hunts',
    icon: '🔢',
    rarity: 'epic',
    requirement: 10,
  },
  {
    id: 'legend',
    name: 'Word Hunt Legend',
    description: 'Reach level 10',
    icon: '👑',
    rarity: 'legendary',
    requirement: 10,
  },
  {
    id: 'hard-mode-champion',
    name: 'Hard Mode Champion',
    description: 'Complete a hard difficulty game',
    icon: '💪',
    rarity: 'epic',
  },
  {
    id: 'no-time-waster',
    name: 'No Time Waster',
    description: 'Beat the time limit in timed mode',
    icon: '⏱️',
    rarity: 'rare',
  },
];

const RARITY_COLORS = {
  common: { border: 'border-gray-500', bg: 'bg-gray-500/20', text: 'text-gray-300' },
  rare: { border: 'border-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  epic: { border: 'border-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-300' },
  legendary: { border: 'border-yellow-500', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
};

// XP calculation (like Roblox leveling)
export function calculateXP(score: number, stars: number, difficulty: string): number {
  const baseXP = score / 10;
  const starBonus = stars * 20;
  const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
  return Math.floor((baseXP + starBonus) * difficultyMultiplier);
}

// Level calculation
export function calculateLevel(totalXP: number): number {
  // Exponential leveling like Roblox (100 XP for level 1, 150 for 2, etc.)
  let level = 1;
  let xpNeeded = 100;
  let currentXP = 0;

  while (currentXP + xpNeeded <= totalXP) {
    currentXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.2); // 20% increase per level
  }

  return level;
}

export function getXPToNextLevel(currentXP: number): {
  current: number;
  needed: number;
  level: number;
} {
  const level = calculateLevel(currentXP);
  let xpForCurrentLevel = 0;
  let xpNeeded = 100;

  for (let i = 1; i < level; i++) {
    xpForCurrentLevel += xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 1.2);
  }

  return {
    current: currentXP - xpForCurrentLevel,
    needed: xpNeeded,
    level,
  };
}

// Get player stats
export function getPlayerStats(): PlayerStats {
  const saved = appStore.get<PlayerStats>('word-hunt-stats');
  if (saved) {
    try {
      return saved;
    } catch {
      return getDefaultStats();
    }
  }
  return getDefaultStats();
}

function getDefaultStats(): PlayerStats {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalGamesPlayed: 0,
    totalWordsFound: 0,
    fastestTime: Infinity,
    highestScore: 0,
    badges: WORD_HUNT_BADGES.map((b) => ({ ...b })),
    streak: 0,
    lastPlayed: '',
  };
}

// Save player stats
export function savePlayerStats(stats: PlayerStats): void {
  appStore.set('word-hunt-stats', JSON.stringify(stats));
}

// Check and unlock badges
export function checkBadgeUnlocks(
  stats: PlayerStats,
  gameData: {
    wordsFound: number;
    timeSpent: number;
    hintsUsed: number;
    difficulty: string;
    subject: string;
    allWordsFound: boolean;
  },
): { stats: PlayerStats; newBadges: GameBadge[] } {
  const newBadges: GameBadge[] = [];

  stats.badges.forEach((badge) => {
    if (badge.unlockedAt) return; // Already unlocked

    let shouldUnlock = false;

    switch (badge.id) {
      case 'first-word':
        shouldUnlock = gameData.wordsFound >= 1;
        break;
      case 'speed-demon':
        shouldUnlock = gameData.timeSpent < 120 && gameData.allWordsFound;
        break;
      case 'no-hints-hero':
        shouldUnlock = gameData.hintsUsed === 0 && gameData.allWordsFound;
        break;
      case 'perfect-game':
        shouldUnlock =
          gameData.hintsUsed === 0 && gameData.timeSpent < 180 && gameData.allWordsFound;
        break;
      case 'streak-master':
        shouldUnlock = stats.streak >= 7;
        break;
      case 'word-hunter':
        badge.progress = stats.totalWordsFound;
        shouldUnlock = stats.totalWordsFound >= 100;
        break;
      case 'math-master':
        // Would need to track per-subject counts
        break;
      case 'legend':
        badge.progress = stats.level;
        shouldUnlock = stats.level >= 10;
        break;
      case 'hard-mode-champion':
        shouldUnlock = gameData.difficulty === 'hard' && gameData.allWordsFound;
        break;
      case 'no-time-waster':
        shouldUnlock =
          gameData.timeSpent <
          (gameData.difficulty === 'easy' ? 300 : gameData.difficulty === 'medium' ? 480 : 600);
        break;
    }

    if (shouldUnlock && !badge.unlockedAt) {
      badge.unlockedAt = Date.now();
      newBadges.push(badge);
    }
  });

  return { stats, newBadges };
}

// Update stats after game completion
export function updateGameStats(
  wordsFound: number,
  totalWords: number,
  timeSpent: number,
  score: number,
  difficulty: string,
  subject: string,
  hintsUsed: number,
): { stats: PlayerStats; newBadges: GameBadge[]; leveledUp: boolean; newLevel?: number } {
  const stats = getPlayerStats();

  // Update basic stats
  stats.totalGamesPlayed++;
  stats.totalWordsFound += wordsFound;
  stats.fastestTime = Math.min(stats.fastestTime, timeSpent);
  stats.highestScore = Math.max(stats.highestScore, score);

  // Update streak
  const today = new Date().toDateString();
  if (stats.lastPlayed !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastPlayed === yesterday.toDateString()) {
      stats.streak++;
    } else if (stats.lastPlayed !== '') {
      stats.streak = 1;
    } else {
      stats.streak = 1;
    }
    stats.lastPlayed = today;
  }

  // Calculate XP and check level up
  const earnedXP = calculateXP(
    score,
    wordsFound === totalWords ? 3 : wordsFound > totalWords / 2 ? 2 : 1,
    difficulty,
  );
  const oldLevel = stats.level;
  stats.xp += earnedXP;
  stats.level = calculateLevel(stats.xp);
  const leveledUp = stats.level > oldLevel;
  const xpInfo = getXPToNextLevel(stats.xp);
  stats.xpToNextLevel = xpInfo.needed;

  // Check badge unlocks
  const badgeCheck = checkBadgeUnlocks(stats, {
    wordsFound,
    timeSpent,
    hintsUsed,
    difficulty,
    subject,
    allWordsFound: wordsFound === totalWords,
  });

  stats.badges = badgeCheck.stats.badges;

  // Save
  savePlayerStats(stats);

  return {
    stats,
    newBadges: badgeCheck.newBadges,
    leveledUp,
    newLevel: leveledUp ? stats.level : undefined,
  };
}

export { RARITY_COLORS, WORD_HUNT_BADGES };
