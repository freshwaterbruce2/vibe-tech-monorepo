import { TOKEN_REWARDS } from './tokenService';

export type GameProgressionSource = 'brain-gym' | 'learning-realm';

export interface GameCompletionDetails {
  source: GameProgressionSource;
  stars?: number;
  timeSpent?: number;
  subject?: string;
  tokensEarned?: number;
}

export interface NormalizedGameCompletion {
  rawGameId: string;
  canonicalGameId: string;
  achievementKey: string;
  displayName: string;
  source: GameProgressionSource;
  subject?: string;
  score: number;
  stars: number;
  timeSpent?: number;
  tokensEarned: number;
}

export interface WorksheetCompletionPayload {
  subject: string;
  score: number;
  starsEarned: number;
  tokensEarned: number;
}

const GAME_ID_ALIASES: Record<string, string> = {
  'boss-history': 'bossbattle',
  'boss-math': 'bossbattle',
  'boss-science': 'bossbattle',
  math: 'mathadventure',
  'math-adventure': 'mathadventure',
  memorymatch: 'memory',
  patternquest: 'pattern',
  'word-builder': 'wordbuilder',
  'word-search': 'wordsearch',
};

const GAME_DISPLAY_NAMES: Record<string, string> = {
  anagrams: 'Anagrams',
  bossbattle: 'Boss Battle',
  crossword: 'Crossword',
  mathadventure: 'Math Adventure',
  memory: 'Memory Match',
  musicnotes: 'Music Notes',
  pattern: 'Pattern Quest',
  sudoku: 'Sudoku',
  wordbuilder: 'Word Builder',
  wordsearch: 'Word Search',
};

const GAME_BASE_TOKENS: Record<string, number> = {
  anagrams: 15,
  bossbattle: 20,
  crossword: 15,
  mathadventure: 20,
  memory: 10,
  musicnotes: 15,
  pattern: 20,
  sudoku: 20,
  wordbuilder: 15,
  wordsearch: 10,
};

const GAME_ACHIEVEMENT_KEYS: Record<string, string> = {
  anagrams: 'anagrams',
  bossbattle: 'bossBattle',
  crossword: 'crossword',
  mathadventure: 'mathAdventure',
  memory: 'memoryMatch',
  musicnotes: 'musicNotes',
  pattern: 'patternQuest',
  sudoku: 'sudoku',
  wordbuilder: 'wordBuilder',
  wordsearch: 'wordSearch',
};

function normalizeNumber(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value ?? 0));
}

export function canonicalizeGameId(rawGameId: string): string {
  const normalized = rawGameId.trim().toLowerCase();
  return GAME_ID_ALIASES[normalized] ?? normalized;
}

export function getGameDisplayName(rawGameId: string): string {
  const canonicalGameId = canonicalizeGameId(rawGameId);
  return GAME_DISPLAY_NAMES[canonicalGameId] ?? rawGameId;
}

export function getGameBaseTokens(rawGameId: string): number {
  const canonicalGameId = canonicalizeGameId(rawGameId);
  return GAME_BASE_TOKENS[canonicalGameId] ?? TOKEN_REWARDS.GAME_COMPLETE;
}

export function calculateStandardGameTokens(
  rawGameId: string,
  stars: number,
  options?: { streakMultiplier?: number },
): number {
  let tokens = getGameBaseTokens(rawGameId);

  if (stars >= 3) {
    tokens += TOKEN_REWARDS.GAME_PERFECT;
  }

  if (options?.streakMultiplier && options.streakMultiplier > 0) {
    tokens = Math.round(tokens * options.streakMultiplier);
  }

  return Math.max(1, tokens);
}

export function createGameCompletionPayload(
  rawGameId: string,
  score: number,
  details: GameCompletionDetails,
): NormalizedGameCompletion {
  const canonicalGameId = canonicalizeGameId(rawGameId);

  return {
    rawGameId,
    canonicalGameId,
    achievementKey: GAME_ACHIEVEMENT_KEYS[canonicalGameId] ?? canonicalGameId,
    displayName: getGameDisplayName(rawGameId),
    source: details.source,
    subject: details.subject,
    score: normalizeNumber(score),
    stars: Math.min(5, normalizeNumber(details.stars)),
    timeSpent: details.timeSpent !== undefined ? normalizeNumber(details.timeSpent) : undefined,
    tokensEarned: normalizeNumber(details.tokensEarned),
  };
}
