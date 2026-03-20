import {
  Brain,
  BookOpen,
  Calculator,
  ChevronLeft,
  Clock3,
  Flame,
  Gamepad2,
  Gift,
  Grid3X3,
  Search,
  Shapes,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateStandardGameTokens,
  getGameDisplayName,
  type GameCompletionDetails,
} from '../../services/gameProgression';
import { TOKEN_REWARDS } from '../../services/tokenService';
import { appStore } from '../../utils/electronStore';
import { getDifficultyDefaults, type GameConfig, type GameDifficulty } from '../settings/GameSettings';

/* ---------- Lazy game imports ---------- */
const MemoryMatchGame = lazy(async () => import('./MemoryMatchGame'));
const WordSearchGame = lazy(async () => import('./WordSearchGame'));
const SudokuGame = lazy(async () => import('./SudokuGame'));
const PatternQuestGame = lazy(async () => import('./PatternQuestGame'));
const AnagramsGame = lazy(async () => import('./AnagramsGame'));
const CrosswordGame = lazy(async () => import('./CrosswordGame'));
const WordBuilderGame = lazy(async () => import('./WordBuilderGame'));
const MathAdventureGame = lazy(async () => import('./MathAdventureGame'));
const AvatarProfile = lazy(async () => import('../avatar/AvatarProfile'));
const AvatarShop = lazy(async () => import('../avatar/AvatarShop'));

/* ---------- Types ---------- */
type Zone = 'chill' | 'focus' | 'challenge';
type ZoneFilter = 'all' | Zone;

interface GameDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Brain;
  color: string;
  zone: Zone;
  tokens: number;
  minLevel: number;
  difficultyLabel: string;
  focus: string;
}

interface GamePerformanceStats {
  plays: number;
  bestScore: number;
  bestStars: number;
  lastPlayedDate: string;
  lastTokens: number;
  totalTokens: number;
  fastestTime: number | null;
}

interface HubStats {
  xp: number;
  level: number;
  streak: number;
  lastPlayDate: string;
  gamesPlayed: number;
  chestsOpened: number;
  chestProgress: number; // 0-4, unlock at 5
  dailyGoalDate: string;
  dailyGoalProgress: number;
  dailyGoalCompletedOn: string;
  gameStats: Record<string, GamePerformanceStats | undefined>;
}

interface GameTarget {
  label: string;
  detail: string;
  current: number;
  goal: number;
  progressPct: number;
  valueText: string;
}

interface GroupARecommendationConfig {
  memoryDifficulty?: GameDifficulty;
  wordsearchConfig?: Partial<GameConfig>;
}

const WORDSEARCH_RECOMMENDATION = {
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

/* ---------- Zone definitions ---------- */
const ZONE_CONFIG: Record<Zone, { emoji: string; label: string; desc: string; color: string }> = {
  chill: { emoji: '🧘', label: 'Chill Zone', desc: 'Calm & steady. No rush.', color: '#06b6d4' },
  focus: { emoji: '🎯', label: 'Focus Zone', desc: 'Build your skills!', color: '#22d3ee' },
  challenge: { emoji: '⚡', label: 'Challenge Zone', desc: 'Push your limits!', color: '#67e8f9' },
};

const ZONE_ORDER: Zone[] = ['chill', 'focus', 'challenge'];

/* ---------- Constants ---------- */
const GAMES: GameDef[] = [
  // Chill Zone — calm, steady focus
  {
    id: 'memory',
    name: 'Memory Match',
    description: 'Find matching pairs!',
    icon: Grid3X3,
    color: '#06b6d4',
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
  // Challenge Zone — high energy
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
    minLevel: 1,
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

const XP_PER_GAME = 10;
const XP_PER_LEVEL = 100;
const CHEST_THRESHOLD = 5;
const DAILY_GOAL_TARGET = 3;
const DAILY_GOAL_BONUS = 20;
const CONTINUOUS_GAMES = new Set(['pattern', 'wordbuilder', 'mathadventure']);

const DEFAULT_STATS: HubStats = {
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

const EMPTY_GAME_STATS: GamePerformanceStats = {
  plays: 0,
  bestScore: 0,
  bestStars: 0,
  lastPlayedDate: '',
  lastTokens: 0,
  totalTokens: 0,
  fastestTime: null,
};

/* ---------- Helpers ---------- */
function loadStats(): HubStats {
  try {
    const saved = appStore.get<HubStats>('gamesHub_stats');
    if (saved) return { ...DEFAULT_STATS, ...saved };
  } catch {
    /* use defaults */
  }
  return { ...DEFAULT_STATS };
}

function saveStats(stats: HubStats) {
  appStore.set('gamesHub_stats', stats);
}

function getGameStats(stats: HubStats, gameId: string): GamePerformanceStats {
  return stats.gameStats[gameId] ?? EMPTY_GAME_STATS;
}

function formatSeconds(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const mins = globalThis.Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (mins === 0) return `${remainder}s`;
  return `${mins}m ${remainder}s`;
}

function renderStarString(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(globalThis.Math.max(0, 5 - stars))}`;
}

function getRecommendedDifficulty(performance: GamePerformanceStats): GameDifficulty {
  if (performance.plays === 0) return 'easy';
  if (performance.bestStars >= 4 && performance.plays >= 4) return 'hard';
  if (performance.plays >= 2 && performance.bestStars >= 3) return 'medium';
  if (performance.bestStars >= 2 && performance.plays >= 5) return 'medium';
  return 'easy';
}

function getRecommendedWordsearchConfig(performance: GamePerformanceStats): Partial<GameConfig> {
  const difficulty = getRecommendedDifficulty(performance);
  const baseConfig = getDifficultyDefaults(difficulty);
  return {
    ...baseConfig,
    ...WORDSEARCH_RECOMMENDATION[difficulty],
    difficulty,
  };
}

function getLaunchConfigForGroupA(gameId: string, performance: GamePerformanceStats): GroupARecommendationConfig {
  if (gameId === 'memory') {
    return { memoryDifficulty: getRecommendedDifficulty(performance) };
  }
  if (gameId === 'wordsearch') {
    return { wordsearchConfig: getRecommendedWordsearchConfig(performance) };
  }
  return {};
}

function roundUpToStep(value: number, step: number): number {
  return globalThis.Math.ceil(value / step) * step;
}

function createGameTarget(game: GameDef, performance: GamePerformanceStats, todayKey: string): GameTarget {
  if (performance.plays === 0) {
    return {
      label: 'First Clear',
      detail: 'Finish one run',
      current: 0,
      goal: 1,
      progressPct: 0,
      valueText: '0/1',
    };
  }

  if (performance.bestStars < 3) {
    return {
      label: 'Mastery',
      detail: 'Reach 3 stars',
      current: performance.bestStars,
      goal: 3,
      progressPct: (performance.bestStars / 3) * 100,
      valueText: `${performance.bestStars}/3 stars`,
    };
  }

  const baselineScore = game.zone === 'challenge' ? 140 : game.zone === 'focus' ? 120 : 100;
  const scoreGoal = globalThis.Math.max(
    baselineScore,
    roundUpToStep(performance.bestScore + 20, 25),
  );
  if (performance.bestScore < scoreGoal) {
    return {
      label: 'Score Push',
      detail: `Hit ${scoreGoal} pts`,
      current: performance.bestScore,
      goal: scoreGoal,
      progressPct: globalThis.Math.min(100, (performance.bestScore / scoreGoal) * 100),
      valueText: `${performance.bestScore}/${scoreGoal}`,
    };
  }

  if (performance.plays < 5) {
    return {
      label: 'Consistency',
      detail: 'Complete 5 runs',
      current: performance.plays,
      goal: 5,
      progressPct: (performance.plays / 5) * 100,
      valueText: `${performance.plays}/5 runs`,
    };
  }

  const playedToday = performance.lastPlayedDate === todayKey ? 1 : 0;
  return {
    label: 'Daily Check-in',
    detail: 'Play this game today',
    current: playedToday,
    goal: 1,
    progressPct: playedToday * 100,
    valueText: playedToday ? 'Done today' : 'Not started',
  };
}

/** Map game IDs to subject names for Group A games */
const GAME_SUBJECT_MAP: Record<string, string> = {
  memory: 'General',
  wordsearch: 'General',
  anagrams: 'General',
  crossword: 'General',
  sudoku: 'Math',
};

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

interface BrainGymHubProps {
  userTokens: number;
  onEarnTokens: (amount: number, reason?: string) => void;
  onSpendTokens?: (amount: number, reason?: string) => boolean;
  onGameCompleted?: (gameId: string, score: number, details: GameCompletionDetails) => void;
  onClose: () => void;
}

/* ---------- Component ---------- */
export default function BrainGymHub({
  userTokens,
  onEarnTokens,
  onSpendTokens,
  onGameCompleted,
  onClose,
}: BrainGymHubProps) {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeGameLaunchConfig, setActiveGameLaunchConfig] = useState<GroupARecommendationConfig>({});
  const [showAvatarScreen, setShowAvatarScreen] = useState<'profile' | 'shop' | null>(null);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');
  const [stats, setStats] = useState<HubStats>(loadStats);
  const [showChestAnimation, setShowChestAnimation] = useState(false);
  const gameStartRef = useRef(0);
  const continuousGameTokensRef = useRef(0);

  // Track game start time when a game becomes active
  useEffect(() => {
    if (activeGame) {
      gameStartRef.current = Date.now();
      continuousGameTokensRef.current = 0;
    } else {
      gameStartRef.current = 0;
      continuousGameTokensRef.current = 0;
    }
  }, [activeGame]);

  // Streak calculation on mount
  const streakActive = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0] ?? '';
    const yesterday = new Date(now.getTime() - 86400_000).toISOString().split('T')[0] ?? '';
    return stats.lastPlayDate === today || stats.lastPlayDate === yesterday;
  }, [stats.lastPlayDate]);
  const todayKey = new Date().toISOString().split('T')[0] ?? '';

  // Zone filtering — either show all or just games in the selected zone
  const gamesByZone = useMemo(() => {
    const map: Record<Zone, GameDef[]> = { chill: [], focus: [], challenge: [] };
    for (const game of GAMES) {
      map[game.zone].push(game);
    }
    return map;
  }, []);

  const visibleZones = useMemo(() => {
    let zones = ZONE_ORDER;
    if (zoneFilter !== 'all') {
      zones = zones.filter((z) => z === zoneFilter);
    }
    return zones.filter(z => gamesByZone[z] && gamesByZone[z].length > 0);
  }, [zoneFilter, gamesByZone]);

  const xpProgress = ((stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const dailyGoalProgress = stats.dailyGoalDate === todayKey ? stats.dailyGoalProgress : 0;
  const dailyGoalPct = globalThis.Math.min(100, (dailyGoalProgress / DAILY_GOAL_TARGET) * 100);
  const gameTargets = useMemo(
    () =>
      Object.fromEntries(
        GAMES.map((game) => [game.id, createGameTarget(game, getGameStats(stats, game.id), todayKey)]),
      ) as Record<string, GameTarget>,
    [stats, todayKey],
  );
  const totalTrackedRuns = useMemo(
    () => Object.values(stats.gameStats).reduce((sum, entry) => sum + (entry?.plays ?? 0), 0),
    [stats.gameStats],
  );
  const nextUnlockGame = useMemo(
    () => GAMES.find((game) => game.minLevel > stats.level) ?? null,
    [stats.level],
  );
  const featuredRecommendation = useMemo(() => {
    const unlockedGames = GAMES.filter((game) => game.minLevel <= stats.level);
    if (unlockedGames.length === 0) return null;

    return unlockedGames
      .map((game) => {
        const performance = getGameStats(stats, game.id);
        const target = createGameTarget(game, performance, todayKey);
        const hasPlayedToday = performance.lastPlayedDate === todayKey;
        const isFresh = performance.plays === 0;
        const needsMastery = performance.bestStars < 3;
        const score =
          (isFresh ? 90 : 0) +
          (hasPlayedToday ? 0 : 18) +
          globalThis.Math.max(0, 3 - performance.bestStars) * 10 +
          (100 - target.progressPct) / 4 +
          (game.zone === 'challenge' && stats.level >= 2 ? 12 : 0) +
          game.tokens;
        const reason = isFresh
          ? 'Fresh drill ready to clear'
          : needsMastery
            ? 'Quick mastery upgrade available'
            : hasPlayedToday
              ? 'Keep today’s momentum going'
              : 'Great candidate for a comeback run';

        return { game, performance, target, score, reason };
      })
      .sort((left, right) => right.score - left.score)[0];
  }, [stats, todayKey]);
  const FeaturedGameIcon = featuredRecommendation?.game.icon ?? Gamepad2;

  /* ---------- Game complete handler ---------- */
  const handleGameComplete = useCallback(
    (
      gameId: string,
      score: number,
      stars: number,
      timeSpent?: number,
      options?: {
        awardHubTokens?: boolean;
        autoCloseDelayMs?: number;
      },
    ) => {
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) return;
      const awardHubTokens = options?.awardHubTokens ?? true;
      const autoCloseDelayMs = options?.autoCloseDelayMs ?? 1500;
      const completionTime =
        timeSpent ?? (gameStartRef.current ? globalThis.Math.floor((Date.now() - gameStartRef.current) / 1000) : undefined);
      const streakMultiplier = 1 + stats.streak * 0.1;
      let completionTokens = continuousGameTokensRef.current;

      if (awardHubTokens) {
        completionTokens = calculateStandardGameTokens(gameId, stars, {
          streakMultiplier,
        });
        onEarnTokens(completionTokens, `Played ${game.name}`);
      }

      onGameCompleted?.(gameId, score, {
        source: 'brain-gym',
        stars,
        timeSpent: completionTime,
        subject: GAME_SUBJECT_MAP[gameId] ?? 'General',
        tokensEarned: completionTokens,
      });

      // Update stats
      setStats((prev) => {
        const today = new Date().toISOString().split('T')[0] ?? '';
        const newStreak = isToday(prev.lastPlayDate)
          ? prev.streak
          : prev.lastPlayDate === new Date(Date.now() - 86400_000).toISOString().split('T')[0]
            ? prev.streak + 1
            : 1;
        const newXp = prev.xp + XP_PER_GAME;
        const newLevel = globalThis.Math.floor(newXp / XP_PER_LEVEL);
        const newChestProgress = prev.chestProgress + 1;
        const chestUnlocked = newChestProgress >= CHEST_THRESHOLD;
        const previousDailyGoalProgress = prev.dailyGoalDate === today ? prev.dailyGoalProgress : 0;
        const newDailyGoalProgress = previousDailyGoalProgress + 1;
        const dailyGoalAlreadyAwarded = prev.dailyGoalCompletedOn === today;
        const dailyGoalCompletedNow =
          newDailyGoalProgress >= DAILY_GOAL_TARGET && !dailyGoalAlreadyAwarded;
        const previousGameStats = getGameStats(prev, gameId);
        const updatedGameStats: GamePerformanceStats = {
          plays: previousGameStats.plays + 1,
          bestScore: globalThis.Math.max(previousGameStats.bestScore, score),
          bestStars: globalThis.Math.max(previousGameStats.bestStars, stars),
          lastPlayedDate: today,
          lastTokens: completionTokens,
          totalTokens: previousGameStats.totalTokens + completionTokens,
          fastestTime:
            completionTime && completionTime > 0
              ? previousGameStats.fastestTime === null
                ? completionTime
                : globalThis.Math.min(previousGameStats.fastestTime, completionTime)
              : previousGameStats.fastestTime,
        };

        const updated: HubStats = {
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          lastPlayDate: today,
          gamesPlayed: prev.gamesPlayed + 1,
          chestsOpened: chestUnlocked ? prev.chestsOpened + 1 : prev.chestsOpened,
          chestProgress: chestUnlocked ? 0 : newChestProgress,
          dailyGoalDate: today,
          dailyGoalProgress: newDailyGoalProgress,
          dailyGoalCompletedOn:
            dailyGoalCompletedNow || dailyGoalAlreadyAwarded ? today : prev.dailyGoalCompletedOn,
          gameStats: {
            ...prev.gameStats,
            [gameId]: updatedGameStats,
          },
        };

        saveStats(updated);

        if (chestUnlocked) {
          setShowChestAnimation(true);
          onEarnTokens(50, 'Chest unlocked'); // Chest bonus!
          setTimeout(() => setShowChestAnimation(false), 3000);
        }

        if (dailyGoalCompletedNow) {
          onEarnTokens(DAILY_GOAL_BONUS, 'Daily Brain Gym goal');
        }

        // Streak milestone bonuses
        if (newStreak === 3) onEarnTokens(TOKEN_REWARDS.THREE_DAY_STREAK, '3-day streak bonus');
        if (newStreak === 7) onEarnTokens(TOKEN_REWARDS.SEVEN_DAY_STREAK, '7-day streak bonus');
        if (newStreak === 30) onEarnTokens(TOKEN_REWARDS.THIRTY_DAY_STREAK, '30-day streak bonus');

        return updated;
      });

      // Back to hub after a moment
    setTimeout(() => {
      setActiveGame(null);
      setActiveGameLaunchConfig({});
    }, autoCloseDelayMs);
    },
    [onEarnTokens, onGameCompleted, stats.streak],
  );

  const closeActiveGame = useCallback(() => {
    if (activeGame && CONTINUOUS_GAMES.has(activeGame) && continuousGameTokensRef.current > 0) {
      const earnedInSession = continuousGameTokensRef.current;
      const stars = earnedInSession >= 20 ? 3 : earnedInSession >= 10 ? 2 : 1;
      handleGameComplete(activeGame, earnedInSession * 10, stars, undefined, {
        awardHubTokens: false,
        autoCloseDelayMs: 0,
      });
    }
    gameStartRef.current = 0;
    continuousGameTokensRef.current = 0;
    setActiveGame(null);
    setActiveGameLaunchConfig({});
  }, [activeGame, handleGameComplete]);

  const launchGame = useCallback(
    (gameId: string) => {
      const performance = getGameStats(stats, gameId);
      setActiveGame(gameId);
      setActiveGameLaunchConfig(getLaunchConfigForGroupA(gameId, performance));
    },
    [stats],
  );

  /* ---------- Render active game ---------- */
  if (activeGame) {
    const fallback = (
      <div className="gh-fallback">
        <div className="gh-fallback-inner">
          <Gamepad2 size={48} className="gh-fallback-icon" />
          <p className="gh-fallback-text">Loading game...</p>
        </div>
      </div>
    );

    // Group A games: subject + onComplete(score, stars, timeSpent) + onBack
    const groupAProps = {
      subject: GAME_SUBJECT_MAP[activeGame] ?? 'General',
      onComplete: (score: number, stars: number, timeSpent: number) => {
        gameStartRef.current = 0;
        continuousGameTokensRef.current = 0;
        handleGameComplete(activeGame, score, stars, timeSpent);
      },
      onBack: () => {
        closeActiveGame();
      },
    };
    const memoryProps = {
      ...groupAProps,
      initialDifficulty: activeGameLaunchConfig.memoryDifficulty,
    };
    const wordSearchProps = {
      ...groupAProps,
      initialConfig: activeGameLaunchConfig.wordsearchConfig,
    };

    // Group B games: onEarnTokens + onClose
    const groupBProps = {
      onEarnTokens: (amount: number) => {
        if (amount <= 0) return;
        continuousGameTokensRef.current += amount;
        onEarnTokens(amount, `Played ${getGameDisplayName(activeGame ?? 'game')}`);
      },
      onClose: () => {
        closeActiveGame();
      },
    };

    return (
      <Suspense fallback={fallback}>
        <div className="gh-active-game">
          <button onClick={closeActiveGame} aria-label="Back to games hub" className="gh-back-btn">
            <ChevronLeft size={16} /> Back
          </button>
          {/* Group A: subject/onComplete/onBack */}
          {activeGame === 'memory' && <MemoryMatchGame {...memoryProps} />}
          {activeGame === 'wordsearch' && <WordSearchGame {...wordSearchProps} />}
          {activeGame === 'anagrams' && <AnagramsGame {...groupAProps} />}
          {activeGame === 'crossword' && <CrosswordGame {...groupAProps} />}
          {activeGame === 'sudoku' && (
            <SudokuGame onComplete={groupAProps.onComplete} onBack={groupAProps.onBack} />
          )}
          {/* Group B: onEarnTokens/onClose */}
          {activeGame === 'pattern' && <PatternQuestGame {...groupBProps} />}
          {activeGame === 'wordbuilder' && <WordBuilderGame {...groupBProps} />}
          {activeGame === 'mathadventure' && <MathAdventureGame {...groupBProps} />}
        </div>
      </Suspense>
    );
  }

  if (showAvatarScreen === 'profile') {
    return (
      <div className="gh-wrapper">
        <div className="gh-hub p-5 overflow-y-auto">
          <button onClick={() => setShowAvatarScreen(null)} className="gh-header-back mb-5">
            <ChevronLeft size={18} /> Back to Hub
          </button>
          <Suspense fallback={<div>Loading Profile...</div>}>
            <AvatarProfile onOpenShop={() => setShowAvatarScreen('shop')} />
          </Suspense>
        </div>
      </div>
    );
  }

  if (showAvatarScreen === 'shop') {
    return (
      <div className="gh-wrapper">
        <div className="gh-hub p-5 overflow-y-auto">
          <button onClick={() => setShowAvatarScreen('profile')} className="gh-header-back mb-5">
            <ChevronLeft size={18} /> Back to Profile
          </button>
          <Suspense fallback={<div>Loading Shop...</div>}>
            <AvatarShop
              userTokens={userTokens}
              onSpendTokens={onSpendTokens ?? (() => false)}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  /* ---------- Hub view ---------- */
  return (
    <div className="gh-wrapper">
      <div className="gh-hub">
        {/* Header */}
        <div className="gh-header">
          <button onClick={onClose} className="gh-header-back">
            <ChevronLeft size={18} /> Back
          </button>
          <h2 className="gh-title">
            <Gamepad2 size={28} className="gh-title-icon" /> 
            Brain Gym
          </h2>
          <div className="gh-header-spacer flex justify-end flex-1">
            <button 
              onClick={() => setShowAvatarScreen('profile')}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg border-none cursor-pointer font-bold hover:bg-blue-600 transition-colors">
              <Sparkles size={16} /> My Avatar
            </button>
          </div>
        </div>
        <p className="gh-subtitle">Synapse Station</p>

      {/* Stats bar */}
      <div className="gh-stats-grid">
        {/* Tokens */}
        <div className="gh-stat-box" style={{ '--stat-accent': '#f59e0b' } as React.CSSProperties}>
          <Star size={18} color="#f59e0b" />
          <span className="gh-stat-value">{userTokens}</span>
          <span className="gh-stat-label">Synapses</span>
        </div>
        {/* Level */}
        <div className="gh-stat-box" style={{ '--stat-accent': '#22d3ee' } as React.CSSProperties}>
          <Trophy size={18} color="#22d3ee" />
          <span className="gh-stat-value">{stats.level}</span>
          <span className="gh-stat-label">Cognitive Fitness</span>
        </div>
        {/* Streak */}
        <div
          className="gh-stat-box"
          style={{ '--stat-accent': streakActive ? '#06b6d4' : '#475569' } as React.CSSProperties}
        >
          <Flame size={18} color={streakActive ? '#06b6d4' : '#475569'} />
          <span className="gh-stat-value">{stats.streak}</span>
          <span className="gh-stat-label">Neural Link</span>
        </div>
        {/* Chest */}
        <div className="gh-stat-box" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
          <Gift size={18} color="#10b981" />
          <span className="gh-stat-value">{stats.chestProgress}/5</span>
          <span className="gh-stat-label">Data Cache</span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="gh-xp-section">
        <div className="gh-xp-labels">
          <span>
            {stats.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} Cognitive Load
          </span>
          <span>Fitness {stats.level + 1}</span>
        </div>
        <div className="gh-xp-track">
          <div
            className="gh-xp-fill"
            style={{ '--xp-pct': `${xpProgress}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {featuredRecommendation && (
        <section
          className="gh-zone-section"
          style={
            {
              '--zone-color': ZONE_CONFIG[featuredRecommendation.game.zone].color,
            } as React.CSSProperties
          }
        >
          <div className="gh-zone-header">
            <span className="gh-zone-emoji">🎯</span>
            <div className="gh-zone-info">
              <h3 className="gh-zone-title flex items-center gap-2">
                <Target size={16} />
                Featured Drill
              </h3>
              <p className="gh-zone-desc">Recommended next run based on your recent Brain Gym data</p>
            </div>
            <span className="gh-zone-count">Recommended</span>
          </div>

          <div className="gh-featured-grid">
            <button
              onClick={() => launchGame(featuredRecommendation.game.id)}
              className="gh-game-card gh-featured-card"
            >
              <div
                className="gh-card-stripe"
                style={
                  {
                    '--stripe-color': ZONE_CONFIG[featuredRecommendation.game.zone].color,
                  } as React.CSSProperties
                }
              />

              <div
                className="gh-game-icon-box"
                style={{ '--icon-bg': `${featuredRecommendation.game.color}15` } as React.CSSProperties}
              >
                <FeaturedGameIcon size={28} color={featuredRecommendation.game.color} />
              </div>

              <h3 className="gh-game-name">{featuredRecommendation.game.name}</h3>
              <p className="gh-game-desc">{featuredRecommendation.game.description}</p>
              <p className="gh-featured-reason">{featuredRecommendation.reason}.</p>

              <div className="gh-featured-meta">
                <span className="gh-featured-pill">
                  {featuredRecommendation.target.label}: {featuredRecommendation.target.valueText}
                </span>
                <span className="gh-featured-pill">
                  {ZONE_CONFIG[featuredRecommendation.game.zone].label}
                </span>
                <span className="gh-featured-pill">{featuredRecommendation.game.difficultyLabel}</span>
                <span className="gh-featured-pill">{featuredRecommendation.game.focus}</span>
                <span className="gh-featured-pill">
                  {featuredRecommendation.performance.plays > 0
                    ? `Best ${featuredRecommendation.performance.bestScore}`
                    : 'First clear'}
                </span>
                <span className="gh-featured-pill">
                  Fastest {formatSeconds(featuredRecommendation.performance.fastestTime)}
                </span>
              </div>

              <div className="gh-token-reward">
                <Zap size={14} className="gh-token-icon" />
                <span className="gh-token-text">Launch {featuredRecommendation.game.name}</span>
              </div>
              <div className="gh-target-block mt-3">
                <div className="gh-target-header">
                  <span className="gh-target-label">{featuredRecommendation.target.label}</span>
                  <span className="gh-target-value">{featuredRecommendation.target.valueText}</span>
                </div>
                <p className="gh-target-detail">{featuredRecommendation.target.detail}</p>
                <div className="gh-target-track">
                  <div
                    className="gh-target-fill"
                    style={
                      { '--target-pct': `${featuredRecommendation.target.progressPct}%` } as React.CSSProperties
                    }
                  />
                </div>
              </div>
            </button>

            <div className="gh-featured-panel">
              <div className="gh-stat-box" style={{ '--stat-accent': '#10b981' } as React.CSSProperties}>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <Target size={12} color="#10b981" />
                  Daily Goal
                </div>
                <span className="gh-stat-value">
                  {dailyGoalProgress}/{DAILY_GOAL_TARGET}
                </span>
                <span className="gh-stat-label">
                  {stats.dailyGoalCompletedOn === todayKey
                    ? `Completed +${DAILY_GOAL_BONUS}`
                    : `${DAILY_GOAL_TARGET - globalThis.Math.min(dailyGoalProgress, DAILY_GOAL_TARGET)} runs left`}
                </span>
                <div className="gh-target-track mt-2 w-full">
                  <div
                    className="gh-target-fill"
                    style={{ '--target-pct': `${dailyGoalPct}%` } as React.CSSProperties}
                  />
                </div>
              </div>
              <div className="gh-stat-box" style={{ '--stat-accent': '#22d3ee' } as React.CSSProperties}>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <Trophy size={12} color="#22d3ee" />
                  Total Runs
                </div>
                <span className="gh-stat-value">{totalTrackedRuns}</span>
                <span className="gh-stat-label">completed Brain Gym sessions</span>
              </div>
              <div className="gh-stat-box" style={{ '--stat-accent': '#67e8f9' } as React.CSSProperties}>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                  <Clock3 size={12} color="#67e8f9" />
                  Next Unlock
                </div>
                <span className="gh-stat-value text-base">
                  {nextUnlockGame ? `${nextUnlockGame.minLevel}` : 'MAX'}
                </span>
                <span className="gh-stat-label">
                  {nextUnlockGame ? nextUnlockGame.name : 'All drills live'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Chest animation */}
      {showChestAnimation && (
        <div className="gh-chest-banner">
          <Gift size={32} className="gh-chest-icon" />
          <p className="gh-chest-text">🎉 Data Cache Unlocked! +50 Synapses!</p>
        </div>
      )}

      {/* Zone filter tabs */}
      <div className="gh-filters">
        <button
          onClick={() => setZoneFilter('all')}
          className={`gh-filter-btn ${zoneFilter === 'all' ? 'gh-filter-btn--active' : 'gh-filter-btn--inactive'}`}
        >
          🎮 All Zones
        </button>
        {ZONE_ORDER.map((z) => {
          const cfg = ZONE_CONFIG[z];
          return (
            <button
              key={z}
              onClick={() => setZoneFilter(z)}
              className={`gh-filter-btn ${zoneFilter === z ? 'gh-filter-btn--active' : 'gh-filter-btn--inactive'}`}
              style={
                zoneFilter === z
                  ? ({ '--filter-accent': cfg.color } as React.CSSProperties)
                  : undefined
              }
            >
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Zone sections */}
      <div className="gh-zones">
        {visibleZones.map((zone) => {
          const cfg = ZONE_CONFIG[zone];
          const games = gamesByZone[zone];
          return (
            <section
              key={zone}
              className={`gh-zone-section gh-zone--${zone}`}
              style={{ '--zone-color': cfg.color } as React.CSSProperties}
            >
              {/* Zone header */}
              <div className="gh-zone-header">
                <span className="gh-zone-emoji">{cfg.emoji}</span>
                <div className="gh-zone-info">
                  <h3 className="gh-zone-title">{cfg.label}</h3>
                  <p className="gh-zone-desc">{cfg.desc}</p>
                </div>
                <span className="gh-zone-count">{games.length} games</span>
              </div>

              {/* Games row */}
              <div className="gh-zone-games">
                {games.map((game) => {
                  const locked = game.minLevel > stats.level;
                  const Icon = game.icon;
                  const performance = getGameStats(stats, game.id);
                  const target = gameTargets[game.id];
                  return (
                          <button
                      key={game.id}
                      disabled={locked}
                      onClick={() => !locked && launchGame(game.id)}
                      aria-label={
                        locked
                          ? `${game.name} — unlock at Level ${game.minLevel}`
                          : `Play ${game.name}`
                      }
                      className={`gh-game-card ${locked ? 'gh-game-card--locked' : ''}`}
                    >
                      {/* Zone accent stripe */}
                      <div
                        className="gh-card-stripe"
                        style={{ '--stripe-color': cfg.color } as React.CSSProperties}
                      />

                      <div
                        className="gh-game-icon-box"
                        style={{ '--icon-bg': `${game.color}15` } as React.CSSProperties}
                      >
                        <Icon size={28} color={game.color} />
                      </div>

                      <h3 className="gh-game-name">
                        {locked ? '🔒 ' : ''}
                        {game.name}
                      </h3>
                      <p className="gh-game-desc">
                        {locked ? `Unlock at Fitness ${game.minLevel}` : game.description}
                      </p>

                      {!locked && (
                        <>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-300">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                              {game.difficultyLabel}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                              {game.focus}
                            </span>
                          </div>

                          {performance.plays > 0 ? (
                            <div className="mt-3 grid grid-cols-3 gap-2 text-left">
                              <div className="rounded-xl border border-white/8 bg-slate-950/30 px-2 py-2">
                                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                                  Best
                                </div>
                                <div className="text-sm font-semibold text-white">
                                  {performance.bestScore}
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-slate-950/30 px-2 py-2">
                                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                                  Mastery
                                </div>
                                <div className="text-[11px] font-semibold text-amber-300">
                                  {renderStarString(performance.bestStars)}
                                </div>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-slate-950/30 px-2 py-2">
                                <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                                  Runs
                                </div>
                                <div className="text-sm font-semibold text-white">
                                  {performance.plays}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-cyan-200/85">
                              First clear sets your personal best and fastest time.
                            </p>
                          )}

                          <div className="gh-target-block mt-3">
                            <div className="gh-target-header">
                              <span className="gh-target-label">{target.label}</span>
                              <span className="gh-target-value">{target.valueText}</span>
                            </div>
                            <p className="gh-target-detail">{target.detail}</p>
                            <div className="gh-target-track">
                              <div
                                className="gh-target-fill"
                                style={{ '--target-pct': `${target.progressPct}%` } as React.CSSProperties}
                              />
                            </div>
                          </div>

                          <div className="gh-token-reward">
                            <Zap size={14} className="gh-token-icon" />
                            <span className="gh-token-text">+{game.tokens} Synapses</span>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      </div>
    </div>
  );
}
