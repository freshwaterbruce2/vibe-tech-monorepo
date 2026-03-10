import { useReducer, useEffect, useCallback } from 'react';
import type { SetStateAction } from 'react';
import { dataStore } from '../services/dataStore';
import type { Reward, ClaimedReward } from '../types';

/**
 * State shape for rewards system
 */
interface RewardsState {
  rewards: Reward[];
  claimedRewards: ClaimedReward[];
}

/**
 * Action types for rewards reducer
 */
type RewardsAction =
  | { type: 'LOAD_DATA'; payload: { rewards: Reward[]; claimedRewards: ClaimedReward[] } }
  | { type: 'CLAIM_REWARD'; payload: ClaimedReward }
  | { type: 'REMOVE_CLAIMED_REWARD'; payload: string }
  | { type: 'UPDATE_REWARDS'; payload: Reward[] };

/**
 * Reducer function for rewards state management
 */
const rewardsReducer = (state: RewardsState, action: RewardsAction): RewardsState => {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        rewards: action.payload.rewards,
        claimedRewards: action.payload.claimedRewards,
      };
    case 'CLAIM_REWARD':
      return {
        ...state,
        claimedRewards: [...state.claimedRewards, action.payload],
      };
    case 'REMOVE_CLAIMED_REWARD':
      return {
        ...state,
        claimedRewards: state.claimedRewards.filter((r) => r.id !== action.payload),
      };
    case 'UPDATE_REWARDS':
      return {
        ...state,
        rewards: action.payload,
      };
    default:
      return state;
  }
};

/**
 * Custom hook for managing rewards system using useReducer pattern
 * Handles reward claiming, approval, and persistence
 */
export const useRewards = () => {
  const [state, dispatch] = useReducer(rewardsReducer, {
    rewards: [],
    claimedRewards: [],
  });

  // Load rewards and claimed rewards from dataStore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedRewards, loadedClaimed] = await Promise.all([
          dataStore.getRewards(),
          dataStore.getClaimedRewards(),
        ]);
        dispatch({
          type: 'LOAD_DATA',
          payload: { rewards: loadedRewards, claimedRewards: loadedClaimed },
        });
      } catch (error) {
        console.error('[useRewards] Failed to load data:', error);
      }
    };
    void loadData();
  }, []);

  // Persist rewards to dataStore whenever they change
  useEffect(() => {
    dataStore.saveRewards(state.rewards).catch(console.error);
  }, [state.rewards]);

  /**
   * Claim a reward if user has enough points
   * Returns the cost if successful, 0 if failed
   */
  const claimReward = (rewardId: string, currentPoints: number): number => {
    const reward = state.rewards.find((r) => r.id === rewardId);
    if (!reward) {
      console.error('[useRewards] Reward not found:', rewardId);
      return 0;
    }

    if (currentPoints >= reward.cost) {
      const newClaimedReward: ClaimedReward = {
        ...reward,
        claimedDate: Date.now(),
      };
      dispatch({ type: 'CLAIM_REWARD', payload: newClaimedReward });
      return reward.cost;
    }

    return 0;
  };

  /**
   * Handle reward approval or denial by parent
   * Returns refund amount if denied
   */
  const handleRewardApproval = (claimedRewardId: string, isApproved: boolean): number => {
    const rewardToHandle = state.claimedRewards.find((r) => r.id === claimedRewardId);
    if (!rewardToHandle) {
      console.error('[useRewards] Claimed reward not found:', claimedRewardId);
      return 0;
    }

    // Remove from claimed list in both cases
    dispatch({ type: 'REMOVE_CLAIMED_REWARD', payload: claimedRewardId });

    // Return refund amount if denied
    return isApproved ? 0 : rewardToHandle.cost;
  };

  /**
   * Update rewards list (for parent dashboard)
   * Supports both direct array and callback pattern for React setState compatibility
   */
  const updateRewards = useCallback((action: SetStateAction<Reward[]>): void => {
    if (typeof action === 'function') {
      // Callback pattern: action(prevState) => newState
      // We need to get current state to pass to callback
      const newRewards = action(state.rewards);
      dispatch({ type: 'UPDATE_REWARDS', payload: newRewards });
    } else {
      // Direct array pattern
      dispatch({ type: 'UPDATE_REWARDS', payload: action });
    }
  }, [state.rewards]);

  return {
    rewards: state.rewards,
    claimedRewards: state.claimedRewards,
    claimReward,
    handleRewardApproval,
    updateRewards,
  };
};
