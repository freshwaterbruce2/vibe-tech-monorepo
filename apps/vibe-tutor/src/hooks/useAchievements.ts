import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Achievement } from '../types';
import {
  checkAndUnlockAchievements,
  confirmAchievementAward,
  getAchievements,
  getPendingAchievementAwards,
  type AchievementEvent,
} from '../services/achievementService';
import { logger } from '../utils/logger';

interface State {
  achievements: Achievement[];
  notifications: Achievement[];
  error: boolean;
  settling: boolean;
}
type Action =
  | { type: 'refresh'; achievements: Achievement[] }
  | { type: 'notify'; achievements: Achievement[] }
  | { type: 'error' }
  | { type: 'resolved' }
  | { type: 'settling'; value: boolean }
  | { type: 'clear' };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'refresh':
      return { ...state, achievements: action.achievements };
    case 'notify':
      return { ...state, notifications: [...state.notifications, ...action.achievements] };
    case 'error':
      return { ...state, error: true };
    case 'resolved':
      return { ...state, error: false };
    case 'settling':
      return { ...state, settling: action.value };
    case 'clear':
      return { ...state, notifications: state.notifications.slice(1) };
  }
}
interface Options {
  onAwardTokens?: (amount: number, reason: string, operationId: string) => Promise<boolean>;
}
const LIMIT = 64;

export const useAchievements = ({ onAwardTokens }: Options = {}) => {
  const [state, dispatch] = useReducer(reducer, {
    achievements: [],
    notifications: [],
    error: false,
    settling: false,
  });
  const staged = useRef<AchievementEvent[]>([]);
  const awardRef = useRef(onAwardTokens);
  awardRef.current = onAwardTokens;
  const settlingRef = useRef<Promise<boolean> | null>(null);
  const settle = useCallback(async (): Promise<boolean> => {
    if (settlingRef.current) return settlingRef.current;
    const work = Promise.resolve().then(async () => {
      dispatch({ type: 'settling', value: true });
      try {
        const awards = await getPendingAchievementAwards();
        for (const award of awards) {
          if (!awardRef.current) throw new Error('Achievement settlement is unavailable');
          let awarded = false;
          try {
            awarded = await awardRef.current(
              award.amount,
              `Achievement unlocked: ${award.achievementId}`,
              award.operationId,
            );
          } catch {
            awarded = false;
          }
          if (!awarded) throw new Error('Achievement reward could not be saved');
          await confirmAchievementAward(award.achievementId, award.operationId);
        }
        dispatch({ type: 'refresh', achievements: await getAchievements() });
        return true;
      } catch (error) {
        logger.error('[useAchievements] Settlement needs retry', error);
        dispatch({ type: 'error' });
        return false;
      } finally {
        dispatch({ type: 'settling', value: false });
      }
    });
    settlingRef.current = work;
    try {
      return await work;
    } finally {
      settlingRef.current = null;
    }
  }, []);
  const refresh = useCallback(async () => {
    try {
      dispatch({ type: 'refresh', achievements: await getAchievements() });
      await settle();
    } catch (error) {
      logger.error('[useAchievements] Failed to load canonical state', error);
      dispatch({ type: 'error' });
    }
  }, [settle]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!state.notifications.length) return;
    const timer = window.setTimeout(() => dispatch({ type: 'clear' }), 5000);
    return () => window.clearTimeout(timer);
  }, [state.notifications.length]);
  const handleAchievementEvent = useCallback(
    async (event: AchievementEvent): Promise<boolean> => {
      try {
        const result = await checkAndUnlockAchievements(event);
        if (await settle()) {
          dispatch({ type: 'notify', achievements: result.newlyQualified });
          return true;
        }
        return false;
      } catch (error) {
        // The caller's primary action is already durable; retain a bounded exact retry.
        if (!staged.current.some((item) => JSON.stringify(item) === JSON.stringify(event)))
          staged.current = [...staged.current, event].slice(-LIMIT);
        logger.error('[useAchievements] Event staging needs retry', error);
        dispatch({ type: 'error' });
        return false;
      }
    },
    [settle],
  );
  const retry = useCallback(async () => {
    const pending = staged.current;
    staged.current = [];
    let allStaged = true;
    for (const event of pending) if (!(await handleAchievementEvent(event))) allStaged = false;
    if (allStaged && (await settle())) dispatch({ type: 'resolved' });
  }, [handleAchievementEvent, settle]);
  return {
    achievements: state.achievements,
    newlyUnlocked: state.notifications[0] ?? null,
    bonusTokens: 0,
    handleAchievementEvent,
    clearNotification: () => dispatch({ type: 'clear' }),
    achievementError: state.error,
    retryAchievements: retry,
    isSettlingAchievements: state.settling,
  };
};
