import {
  BookOpen,
  Brain,
  Calculator,
  Gamepad2,
  Grid3X3,
  Search,
  Shapes,
  Sparkles,
} from 'lucide-react';
import type { GameDef, GamePerformanceStats, HubStats, Zone } from './brainGymTypes';

/* ---------- Zone definitions ---------- */
export const ZONE_CONFIG: Record<Zone, { emoji: string; label: string; desc: string; color: string }> = {
  chill: { emoji: '🧘', label: 'Chill Zone', desc: 'Calm & steady. No rush.', color: '#22d3ee' },
  focus: { emoji: '🎯', label: 'Focus Zone', desc: 'Build your skills!', color: '#22d3ee' },
  challenge: { emoji: '⚡', label: 'Challenge Zone', desc: 'Push your limits!', color: '#67e8f9' },
};

export const ZONE_ORDER: Zone[] = ['chill', 'focus', 'challenge'];

/* ---------- Game definitions ---------- */
export const GAMES: GameDef[] = [
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Find matching pairs!',
    icon: Grid3X3,
    color: '#22d3ee',
    zone: 'chill',
    tokens: 10,
    minLevel: 0,
    difficultyLabel: 'Easy',
    focus: 'Word recall',
  },
  {
    id: 'wordsearch',
    name: 'Word Search',
    description: 'Find hidden words!',
    icon: Search,
    color: '#22d3ee',
    zone: 'chill',
    tokens: 10,
    minLevel: 0,
    difficultyLabel: 'Flexible',
    focus: 'Visual scan',
  },
  {
    id: 'anagrams',
    name: 'Anagrams',
    description: 'Unscramble hidden words!',
    icon: Sparkles,
    color: '#38bdf8',
    zone: 'focus',
    tokens: 15,
    minLevel: 0,
    difficultyLabel: 'Rapid',
    focus: 'Spelling recall',
  },
  {
    id: 'crossword',
    name: 'Crossword',
    description: 'Solve clue-based word puzzles!',
    icon: BookOpen,
    color: '#7dd3fc',
    zone: 'focus',
    tokens: 15,
    minLevel: 1,
    difficultyLabel: 'Steady',
    focus: 'Clue solving',
  },
  {
    id: 'wordbuilder',
    name: 'Word Builder',
    description: 'Assemble words from scrambled letters!',
    icon: Gamepad2,
    color: '#67e8f9',
    zone: 'focus',
    tokens: 15,
    minLevel: 1,
    difficultyLabel: 'Arcade',
    focus: 'Letter order',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Number logic puzzles!',
    icon: Brain,
    color: '#67e8f9',
    zone: 'challenge',
    tokens: 20,
    minLevel: 0,
    difficultyLabel: 'Medium',
    focus: 'Logic grid',
  },
  {
    id: 'mathadventure',
    name: 'Math Adventure',
    description: 'Beat math rounds under pressure!',
    icon: Calculator,
    color: '#22d3ee',
    zone: 'challenge',
    tokens: 20,
    minLevel: 0,
    difficultyLabel: 'Scaling',
    focus: 'Mental math',
  },
  {
    id: 'pattern',
    name: 'Pattern Quest',
    description: 'Discover the pattern!',
    icon: Shapes,
    color: '#a5f3fc',
    zone: 'challenge',
    tokens: 20,
    minLevel: 2,
    difficultyLabel: 'Scaling',
    focus: 'Sequence logic',
  },
];

/* ---------- Numeric constants ---------- */
export const XP_PER_GAME = 10;
export const XP_PER_LEVEL = 100;
export const CHEST_THRESHOLD = 5;
export const DAILY_GOAL_TARGET = 3;
export const DAILY_GOAL_BONUS = 20;
export const CONTINUOUS_GAMES = new Set(['pattern', 'wordbuilder', 'mathadventure']);

export const DEFAULT_STATS: HubStats = {
  xp: 0,
  level: 0,
  streak: 0,
  lastPlayDate: '',
  gamesPlayed: 0,
  chestsOpened: 0,
  chestProgress: 0,
  dailyGoalDate: '',
  dailyGoalProgress: 0,
  dailyGoalCompletedOn: '',
  gameStats: {},
};

export const EMPTY_GAME_STATS: GamePerformanceStats = {
  plays: 0,
  bestScore: 0,
  bestStars: 0,
  lastPlayedDate: '',
  lastTokens: 0,
  totalTokens: 0,
  fastestTime: null,
};
