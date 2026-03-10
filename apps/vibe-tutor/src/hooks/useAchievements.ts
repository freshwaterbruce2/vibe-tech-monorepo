import { useReducer, useEffect } from 'react';
import { dataStore } from '../services/dataStore';
import { checkAndUnlockAchievements, AchievementEvent } from '../services/achievementService';
import type { Achievement } from '../types';

/**
 * State shape for achievements system
 */
interface AchievementsState {
  achievements: Achievement[];
  points: number;
  newlyUnlocked: Achievement | null;
  bonusPoints: number;
}

/**
 * Action types for achievements reducer
 */
type AchievementsAction =
  | { type: 'LOAD_DATA'; payload: { achievements: Achievement[]; points: number } }
  | { type: 'UPDATE_ACHIEVEMENTS'; payload: Achievement[] }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: { achievement: Achievement; bonusPoints: number } }
  | { type: 'AWARD_POINTS'; payload: number }
  | { type: 'DEDUCT_POINTS'; payload: number }
  | { type: 'CLEAR_NOTIFICATION' };

/**
 * Reducer function for achievements state management
 */
const achievementsReducer = (state: AchievementsState, action: AchievementsAction): AchievementsState => {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        achievements: action.payload.achievements,
        points: action.payload.points,
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
        bonusPoints: action.payload.bonusPoints,
        points: state.points + action.payload.bonusPoints,
      };
    case 'AWARD_POINTS':
      return {
        ...state,
        points: state.points + action.payload,
      };
    case 'DEDUCT_POINTS':
      return {
        ...state,
        points: Math.max(0, state.points - action.payload),
      };
    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        newlyUnlocked: null,
        bonusPoints: 0,
      };
    default:
      return state;
  }
};

/**
 * Custom hook for managing achievements and points using useReducer pattern
 * Handles achievement unlocking, bonus points, and notifications
 */
export const useAchievements = () => {
  const [state, dispatch] = useReducer(achievementsReducer, {
    achievements: [],
    points: 0,
    newlyUnlocked: null,
    bonusPoints: 0,
  });

  // Load achievements and points from dataStore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedAchievements, loadedPoints] = await Promise.all([
          dataStore.getAchievements(),
          dataStore.getStudentPoints(),
        ]);
        dispatch({
          type: 'LOAD_DATA',
          payload: { achievements: loadedAchievements, points: loadedPoints },
        });
      } catch (error) {
        console.error('[useAchievements] Failed to load data:', error);
      }
    };
    void loadData();
  }, []);

  // Persist points to dataStore whenever they change
  useEffect(() => {
    dataStore.saveStudentPoints(state.points).catch(console.error);
  }, [state.points]);

  /**
   * Handle achievement events and award bonus points
   */
  const handleAchievementEvent = async (event: AchievementEvent): Promise<void> => {
    try {
      const result = await checkAndUnlockAchievements(event);
      dispatch({ type: 'UPDATE_ACHIEVEMENTS', payload: result.achievements });

      // If there are newly unlocked achievements, show toast and award bonus points
      if (result.newlyUnlocked.length > 0) {
        const firstUnlocked = result.newlyUnlocked[0];
        if (firstUnlocked) {
          dispatch({
            type: 'UNLOCK_ACHIEVEMENT',
            payload: { achievement: firstUnlocked, bonusPoints: result.totalBonusPoints },
          });

          // Auto-close toast after 5 seconds
          setTimeout(() => {
            dispatch({ type: 'CLEAR_NOTIFICATION' });
          }, 5000);
        }
      }
    } catch (error) {
      console.error('[useAchievements] Failed to handle achievement event:', error);
    }
  };

  /**
   * Award points to the user
   */
  const awardPoints = (amount: number): void => {
    dispatch({ type: 'AWARD_POINTS', payload: amount });
  };

  /**
   * Deduct points from the user
   */
  const deductPoints = (amount: number): boolean => {
    if (state.points >= amount) {
      dispatch({ type: 'DEDUCT_POINTS', payload: amount });
      return true;
    }
    return false;
  };

  /**
   * Clear the currently displayed achievement notification
   */
  const clearNotification = (): void => {
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  };

  return {
    achievements: state.achievements,
    points: state.points,
    newlyUnlocked: state.newlyUnlocked,
    bonusPoints: state.bonusPoints,
    handleAchievementEvent,
    awardPoints,
    deductPoints,
    clearNotification,
  };
};
