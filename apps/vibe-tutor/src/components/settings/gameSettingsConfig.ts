import { appStore } from '../../utils/electronStore';

export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type TimerMode = 'timed' | 'relaxed';

export interface GameConfig {
  difficulty: GameDifficulty;
  timerMode: TimerMode;
  hintsEnabled: boolean;
  soundEnabled: boolean;
  highContrast?: boolean;
  gridSize?: number;
  wordCount?: number;
  timeLimit?: number;
  hintPenalty?: number;
}

export const DIFFICULTY_INFO = {
  easy: {
    label: 'Easy',
    description: 'Smaller grid, fewer words',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/50',
    gridSize: 8,
    wordCount: 5,
    timeLimit: 300,
    hintPenalty: 6,
  },
  medium: {
    label: 'Medium',
    description: 'Standard challenge',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/50',
    gridSize: 12,
    wordCount: 8,
    timeLimit: 480,
    hintPenalty: 10,
  },
  hard: {
    label: 'Hard',
    description: 'Larger grid, more words',
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/50',
    gridSize: 15,
    wordCount: 12,
    timeLimit: 600,
    hintPenalty: 15,
  },
};

export const GAME_DIFFICULTY_SETTINGS = DIFFICULTY_INFO;

export function getDifficultyConfig(
  difficulty: GameDifficulty,
): Pick<GameConfig, 'gridSize' | 'wordCount' | 'timeLimit' | 'hintPenalty'> {
  const info = DIFFICULTY_INFO[difficulty];
  return {
    gridSize: info.gridSize,
    wordCount: info.wordCount,
    timeLimit: info.timeLimit,
    hintPenalty: info.hintPenalty,
  };
}

export function getDifficultyHintPenalty(difficulty: GameDifficulty): number {
  return DIFFICULTY_INFO[difficulty].hintPenalty;
}

export function getDifficultyDefaults(difficulty: GameDifficulty): GameConfig {
  return {
    difficulty,
    timerMode: 'relaxed',
    hintsEnabled: true,
    soundEnabled: true,
    highContrast: false,
    ...getDifficultyConfig(difficulty),
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  difficulty: 'medium',
  timerMode: 'relaxed',
  hintsEnabled: true,
  soundEnabled: true,
  hintPenalty: getDifficultyHintPenalty('medium'),
  gridSize: 12,
  wordCount: 8,
  timeLimit: 480,
};

export function getSavedGameConfig(gameType: string): GameConfig {
  try {
    const saved = appStore.get<Partial<GameConfig>>(`game-config-${gameType}`);
    if (saved) {
      return {
        ...DEFAULT_GAME_CONFIG,
        ...saved,
        hintPenalty:
          saved.hintPenalty ??
          getDifficultyHintPenalty(saved.difficulty ?? DEFAULT_GAME_CONFIG.difficulty),
      };
    }
  } catch {
    // Invalid data, use defaults
  }
  return DEFAULT_GAME_CONFIG;
}

export function saveGameConfig(gameType: string, config: GameConfig): void {
  try {
    appStore.set(`game-config-${gameType}`, config);
  } catch (error) {
    console.warn('Failed to save game config:', error);
  }
}
