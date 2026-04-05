import type { GameCompletionDetails } from '../../services/gameProgression';
import type { GameConfig, GameDifficulty } from '../settings/gameSettingsConfig';

/* ---------- Types ---------- */
export type Zone = 'chill' | 'focus' | 'challenge';
export type ZoneFilter = 'all' | Zone;

export interface GameDef {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  color: string;
  zone: Zone;
  tokens: number;
  minLevel: number;
  difficultyLabel: string;
  focus: string;
}

export interface GamePerformanceStats {
  plays: number;
  bestScore: number;
  bestStars: number;
  lastPlayedDate: string;
  lastTokens: number;
  totalTokens: number;
  fastestTime: number | null;
}

export interface HubStats {
  xp: number;
  level: number;
  streak: number;
  lastPlayDate: string;
  gamesPlayed: number;
  chestsOpened: number;
  chestProgress: number;
  dailyGoalDate: string;
  dailyGoalProgress: number;
  dailyGoalCompletedOn: string;
  gameStats: Record<string, GamePerformanceStats | undefined>;
}

export interface GameTarget {
  label: string;
  detail: string;
  current: number;
  goal: number;
  progressPct: number;
  valueText: string;
}

export interface GroupARecommendationConfig {
  memoryDifficulty?: GameDifficulty;
  wordsearchConfig?: Partial<GameConfig>;
}

export interface BrainGymHubProps {
  userTokens: number;
  onEarnTokens: (amount: number, reason?: string) => void;
  onSpendTokens?: (amount: number, reason?: string) => boolean;
  onGameCompleted?: (gameId: string, score: number, details: GameCompletionDetails) => void;
  onClose: () => void;
}

export const WORDSEARCH_RECOMMENDATION = {
  easy: {
    hintsEnabled: true,
    timerMode: 'relaxed' as const,
  },
  medium: {
    hintsEnabled: true,
    timerMode: 'timed' as const,
  },
  hard: {
    hintsEnabled: false,
    timerMode: 'timed' as const,
  },
} satisfies Record<GameDifficulty, Pick<GameConfig, 'hintsEnabled' | 'timerMode'>>;
