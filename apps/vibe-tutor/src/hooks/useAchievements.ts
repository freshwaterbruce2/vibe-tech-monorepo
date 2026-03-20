import { useReducer, useEffect } from 'react';
import { dataStore } from '../services/dataStore';
import { checkAndUnlockAchievements, AchievementEvent } from '../services/achievementService';
import type { Achievement } from '../types';

interface AchievementsState {
  achievements: Achievement[];
  newlyUnlocked: Achievement | null;
  bonusTokens: number;
}

type AchievementsAction =
  | { type: 'LOAD_DATA'; payload: { achievements: Achievement[] } }
  | { type: 'UPDATE_ACHIEVEMENTS'; payload: Achievement[] }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: { achievement: Achievement; bonusTokens: number } }
  | { type: 'CLEAR_NOTIFICATION' };

const achievementsReducer = (state: AchievementsState, action: AchievementsAction): AchievementsState => {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        achievements: action.payload.achievements,
      };
    case 'UPDATE_ACHIEVEMENTS':
      return {
        ...state,
        achievements: action.payload,
      };
    case 'UNLOCK_ACHIEVEMENT':
      return {
        ...state,
        newlyUnlocked: action.payload.achievement,
        bonusTokens: action.payload.bonusTokens,
      };
    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        newlyUnlocked: null,
        bonusTokens: 0,
      };
    default:
      return state;
  }
};

interface UseAchievementsOptions {
  onAwardTokens?: (amount: number, reason: string) => void;
}

export const useAchievements = (options: UseAchievementsOptions = {}) => {
  const { onAwardTokens } = options;
  const [state, dispatch] = useReducer(achievementsReducer, {
    achievements: [],
    newlyUnlocked: null,
    bonusTokens: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedAchievements = await dataStore.getAchievements();
        dispatch({
          type: 'LOAD_DATA',
          payload: { achievements: loadedAchievements },
        });
      } catch (error) {
        console.error('[useAchievements] Failed to load data:', error);
      }
    };
    void loadData();
  }, []);

  const handleAchievementEvent = async (event: AchievementEvent): Promise<void> => {
    try {
      const result = await checkAndUnlockAchievements(event);
      dispatch({ type: 'UPDATE_ACHIEVEMENTS', payload: result.achievements });

      if (result.newlyUnlocked.length > 0) {
        const firstUnlocked = result.newlyUnlocked[0];
        if (firstUnlocked) {
          if (result.totalBonusTokens > 0) {
            onAwardTokens?.(result.totalBonusTokens, `Achievement unlocked: ${firstUnlocked.name}`);
          }

          dispatch({
            type: 'UNLOCK_ACHIEVEMENT',
            payload: { achievement: firstUnlocked, bonusTokens: result.totalBonusTokens },
          });

          setTimeout(() => {
            dispatch({ type: 'CLEAR_NOTIFICATION' });
          }, 5000);
        }
      }
    } catch (error) {
      console.error('[useAchievements] Failed to handle achievement event:', error);
    }
  };

  const clearNotification = (): void => {
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  };

  return {
    achievements: state.achievements,
    newlyUnlocked: state.newlyUnlocked,
    bonusTokens: state.bonusTokens,
    handleAchievementEvent,
    clearNotification,
  };
};
