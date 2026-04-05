import { Gamepad2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateStandardGameTokens } from '../../services/gameProgression';
import { TOKEN_REWARDS } from '../../services/tokenService';
import {
  CHEST_THRESHOLD,
  CONTINUOUS_GAMES,
  DAILY_GOAL_BONUS,
  DAILY_GOAL_TARGET,
  GAMES,
  XP_PER_GAME,
  XP_PER_LEVEL,
  ZONE_ORDER,
} from './brainGymConstants';
import {
  createGameTarget,
  getGameStats,
  getLaunchConfigForGroupA,
  isToday,
  loadStats,
  saveStats,
  GAME_SUBJECT_MAP,
} from './brainGymHelpers';
import type {
  BrainGymHubProps,
  GamePerformanceStats,
  GameTarget,
  GroupARecommendationConfig,
  HubStats,
  Zone,
  ZoneFilter,
} from './brainGymTypes';
import type { GameDef } from './brainGymTypes';

export function useBrainGymState(props: BrainGymHubProps) {
  const { onEarnTokens, onGameCompleted } = props;
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [activeGameLaunchConfig, setActiveGameLaunchConfig] = useState<GroupARecommendationConfig>({});
  const [showAvatarScreen, setShowAvatarScreen] = useState<'profile' | 'shop' | null>(null);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');
  const [stats, setStats] = useState<HubStats>(loadStats);
  const [showChestAnimation, setShowChestAnimation] = useState(false);
  const gameStartRef = useRef(0);
  const continuousGameTokensRef = useRef(0);

  useEffect(() => {
    if (activeGame) {
      gameStartRef.current = Date.now();
      continuousGameTokensRef.current = 0;
    } else {
      gameStartRef.current = 0;
      continuousGameTokensRef.current = 0;
    }
  }, [activeGame]);

  const streakActive = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0] ?? '';
    const yesterday = new Date(now.getTime() - 86400_000).toISOString().split('T')[0] ?? '';
    return stats.lastPlayDate === today || stats.lastPlayDate === yesterday;
  }, [stats.lastPlayDate]);

  const todayKey = new Date().toISOString().split('T')[0] ?? '';

  const gamesByZone = useMemo(() => {
    const map: Record<Zone, GameDef[]> = { chill: [], focus: [], challenge: [] };
    for (const game of GAMES) map[game.zone].push(game);
    return map;
  }, []);

  const visibleZones = useMemo(() => {
    let zones = ZONE_ORDER;
    if (zoneFilter !== 'all') zones = zones.filter((z) => z === zoneFilter);
    return zones.filter((z) => gamesByZone[z] && gamesByZone[z].length > 0);
  }, [zoneFilter, gamesByZone]);

  const xpProgress = ((stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const dailyGoalProgress = stats.dailyGoalDate === todayKey ? stats.dailyGoalProgress : 0;
  const dailyGoalPct = globalThis.Math.min(100, (dailyGoalProgress / DAILY_GOAL_TARGET) * 100);

  const gameTargets = useMemo(
    () =>
      Object.fromEntries(
        GAMES.map((g) => [g.id, createGameTarget(g, getGameStats(stats, g.id), todayKey)]),
      ) as Record<string, GameTarget>,
    [stats, todayKey],
  );

  const totalTrackedRuns = useMemo(
    () => Object.values(stats.gameStats).reduce((sum, e) => sum + (e?.plays ?? 0), 0),
    [stats.gameStats],
  );

  const nextUnlockGame = useMemo(
    () => GAMES.find((g) => g.minLevel > stats.level) ?? null,
    [stats.level],
  );

  const featuredRecommendation = useMemo(() => {
    const unlockedGames = GAMES.filter((g) => g.minLevel <= stats.level);
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
              ? "Keep today's momentum going"
              : 'Great candidate for a comeback run';
        return { game, performance, target, score, reason };
      })
      .sort((a, b) => b.score - a.score)[0];
  }, [stats, todayKey]);

  const FeaturedGameIcon = featuredRecommendation?.game.icon ?? Gamepad2;

  /* ---------- Game complete handler ---------- */
  const handleGameComplete = useCallback(
    (
      gameId: string,
      score: number,
      stars: number,
      timeSpent?: number,
      options?: { awardHubTokens?: boolean; autoCloseDelayMs?: number },
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
        completionTokens = calculateStandardGameTokens(gameId, stars, { streakMultiplier });
        onEarnTokens(completionTokens, `Played ${game.name}`);
      }
      onGameCompleted?.(gameId, score, {
        source: 'brain-gym',
        stars,
        timeSpent: completionTime,
        subject: GAME_SUBJECT_MAP[gameId] ?? 'General',
        tokensEarned: completionTokens,
      });
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
        const prevDailyProgress = prev.dailyGoalDate === today ? prev.dailyGoalProgress : 0;
        const newDailyProgress = prevDailyProgress + 1;
        const dailyAlreadyAwarded = prev.dailyGoalCompletedOn === today;
        const dailyCompletedNow = newDailyProgress >= DAILY_GOAL_TARGET && !dailyAlreadyAwarded;
        const prevGame = getGameStats(prev, gameId);
        const updatedGame: GamePerformanceStats = {
          plays: prevGame.plays + 1,
          bestScore: globalThis.Math.max(prevGame.bestScore, score),
          bestStars: globalThis.Math.max(prevGame.bestStars, stars),
          lastPlayedDate: today,
          lastTokens: completionTokens,
          totalTokens: prevGame.totalTokens + completionTokens,
          fastestTime:
            completionTime && completionTime > 0
              ? prevGame.fastestTime === null
                ? completionTime
                : globalThis.Math.min(prevGame.fastestTime, completionTime)
              : prevGame.fastestTime,
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
          dailyGoalProgress: newDailyProgress,
          dailyGoalCompletedOn: dailyCompletedNow || dailyAlreadyAwarded ? today : prev.dailyGoalCompletedOn,
          gameStats: { ...prev.gameStats, [gameId]: updatedGame },
        };
        saveStats(updated);
        if (chestUnlocked) {
          setShowChestAnimation(true);
          onEarnTokens(50, 'Chest unlocked');
          setTimeout(() => setShowChestAnimation(false), 3000);
        }
        if (dailyCompletedNow) onEarnTokens(DAILY_GOAL_BONUS, 'Daily Brain Gym goal');
        if (newStreak === 3) onEarnTokens(TOKEN_REWARDS.THREE_DAY_STREAK, '3-day streak bonus');
        if (newStreak === 7) onEarnTokens(TOKEN_REWARDS.SEVEN_DAY_STREAK, '7-day streak bonus');
        if (newStreak === 30) onEarnTokens(TOKEN_REWARDS.THIRTY_DAY_STREAK, '30-day streak bonus');
        return updated;
      });
      setTimeout(() => {
        setActiveGame(null);
        setActiveGameLaunchConfig({});
      }, autoCloseDelayMs);
    },
    [onEarnTokens, onGameCompleted, stats.streak],
  );

  const closeActiveGame = useCallback(() => {
    if (activeGame && CONTINUOUS_GAMES.has(activeGame) && continuousGameTokensRef.current > 0) {
      const earned = continuousGameTokensRef.current;
      const stars = earned >= 20 ? 3 : earned >= 10 ? 2 : 1;
      handleGameComplete(activeGame, earned * 10, stars, undefined, {
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

  return {
    activeGame,
    activeGameLaunchConfig,
    showAvatarScreen,
    setShowAvatarScreen,
    zoneFilter,
    setZoneFilter,
    stats,
    showChestAnimation,
    continuousGameTokensRef,
    gameStartRef,
    streakActive,
    todayKey,
    gamesByZone,
    visibleZones,
    xpProgress,
    dailyGoalProgress,
    dailyGoalPct,
    gameTargets,
    totalTrackedRuns,
    nextUnlockGame,
    featuredRecommendation,
    FeaturedGameIcon,
    handleGameComplete,
    closeActiveGame,
    launchGame,
  };
}
