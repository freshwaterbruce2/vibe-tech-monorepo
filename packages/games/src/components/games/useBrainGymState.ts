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
  const gameSessionIdRef = useRef<string | null>(null);
  const continuousAwardOrdinalRef = useRef(0);
  const continuousOperationIdsRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (activeGame) {
      gameStartRef.current = Date.now();
      continuousGameTokensRef.current = 0;
      continuousAwardOrdinalRef.current = 0;
      continuousOperationIdsRef.current.clear();
      gameSessionIdRef.current = `brain-gym:${todayKey}:${activeGame}:${stats.gamesPlayed + 1}`;
    } else {
      gameStartRef.current = 0;
      continuousGameTokensRef.current = 0;
      gameSessionIdRef.current = null;
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
    async (
      gameId: string,
      score: number,
      stars: number,
      timeSpent?: number,
      options?: { awardHubTokens?: boolean; autoCloseDelayMs?: number },
    ): Promise<void> => {
      const game = GAMES.find((g) => g.id === gameId);
      if (!game) return;
      const awardHubTokens = options?.awardHubTokens ?? true;
      const autoCloseDelayMs = options?.autoCloseDelayMs ?? 1500;
      const completionTime =
        timeSpent ?? (gameStartRef.current ? globalThis.Math.floor((Date.now() - gameStartRef.current) / 1000) : undefined);
      const streakMultiplier = 1 + stats.streak * 0.1;
      let completionTokens = continuousGameTokensRef.current;
      const sessionId = gameSessionIdRef.current;
      if (!sessionId) return;
      if (awardHubTokens) {
        completionTokens = calculateStandardGameTokens(gameId, stars, { streakMultiplier });
        if (!await onEarnTokens(completionTokens, `Played ${game.name}`, `${sessionId}:completion`)) return;
      }
      const previous = stats;
      const today = new Date().toISOString().split('T')[0] ?? '';
      const newStreak = isToday(previous.lastPlayDate) ? previous.streak : previous.lastPlayDate === new Date(Date.now() - 86400_000).toISOString().split('T')[0] ? previous.streak + 1 : 1;
      const newChestProgress = previous.chestProgress + 1;
      const chestUnlocked = newChestProgress >= CHEST_THRESHOLD;
      const newDailyProgress = (previous.dailyGoalDate === today ? previous.dailyGoalProgress : 0) + 1;
      const dailyCompletedNow = newDailyProgress >= DAILY_GOAL_TARGET && previous.dailyGoalCompletedOn !== today;
      const bonusAwards: Array<[number, string, string]> = [];
      if (chestUnlocked) bonusAwards.push([50, 'Chest unlocked', `${sessionId}:chest:${previous.chestsOpened + 1}`]);
      if (dailyCompletedNow) bonusAwards.push([DAILY_GOAL_BONUS, 'Daily Brain Gym goal', `${sessionId}:daily:${today}`]);
      if ([3, 7, 30].includes(newStreak)) bonusAwards.push([newStreak === 3 ? TOKEN_REWARDS.THREE_DAY_STREAK : newStreak === 7 ? TOKEN_REWARDS.SEVEN_DAY_STREAK : TOKEN_REWARDS.THIRTY_DAY_STREAK, `${newStreak}-day streak bonus`, `${sessionId}:streak:${today}:${newStreak}`]);
      for (const [amount, reason, operationId] of bonusAwards) if (!await onEarnTokens(amount, reason, operationId)) return;
      const prevGame = getGameStats(previous, gameId);
      const updated: HubStats = {
        xp: previous.xp + XP_PER_GAME, level: globalThis.Math.floor((previous.xp + XP_PER_GAME) / XP_PER_LEVEL), streak: newStreak, lastPlayDate: today,
        gamesPlayed: previous.gamesPlayed + 1, chestsOpened: chestUnlocked ? previous.chestsOpened + 1 : previous.chestsOpened, chestProgress: chestUnlocked ? 0 : newChestProgress,
        dailyGoalDate: today, dailyGoalProgress: newDailyProgress, dailyGoalCompletedOn: dailyCompletedNow || previous.dailyGoalCompletedOn === today ? today : previous.dailyGoalCompletedOn,
        gameStats: { ...previous.gameStats, [gameId]: { plays: prevGame.plays + 1, bestScore: globalThis.Math.max(prevGame.bestScore, score), bestStars: globalThis.Math.max(prevGame.bestStars, stars), lastPlayedDate: today, lastTokens: completionTokens, totalTokens: prevGame.totalTokens + completionTokens, fastestTime: completionTime && completionTime > 0 ? (prevGame.fastestTime === null ? completionTime : globalThis.Math.min(prevGame.fastestTime, completionTime)) : prevGame.fastestTime } },
      };
      saveStats(updated);
      setStats(updated);
      if (chestUnlocked) {
        setShowChestAnimation(true);
        setTimeout(() => setShowChestAnimation(false), 3000);
      }
      onGameCompleted?.(gameId, score, { source: 'brain-gym', stars, timeSpent: completionTime, subject: GAME_SUBJECT_MAP[gameId] ?? 'General', tokensEarned: completionTokens });
      setTimeout(() => {
        setActiveGame(null);
        setActiveGameLaunchConfig({});
      }, autoCloseDelayMs);
    },
    [onEarnTokens, onGameCompleted, stats],
  );

  const closeActiveGame = useCallback(async () => {
    if (activeGame && CONTINUOUS_GAMES.has(activeGame) && continuousGameTokensRef.current > 0) {
      const earned = continuousGameTokensRef.current;
      const stars = earned >= 20 ? 3 : earned >= 10 ? 2 : 1;
      await handleGameComplete(activeGame, earned * 10, stars, undefined, {
        awardHubTokens: false,
        autoCloseDelayMs: 0,
      });
      return;
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
  const nextContinuousOperationId = useCallback((awardKey?: string) => {
    const sessionId = gameSessionIdRef.current;
    if (!sessionId) return null;
    if (awardKey) {
      const existing = continuousOperationIdsRef.current.get(awardKey);
      if (existing) return existing;
    }
    continuousAwardOrdinalRef.current += 1;
    const operationId = `${sessionId}:continuous:${continuousAwardOrdinalRef.current}`;
    if (awardKey) continuousOperationIdsRef.current.set(awardKey, operationId);
    return operationId;
  }, []);

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
    nextContinuousOperationId,
  };
}
