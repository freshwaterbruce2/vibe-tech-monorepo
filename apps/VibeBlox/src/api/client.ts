/**
 * VibeBlox API Client
 * Handles all API requests with authentication
 */

import type { UserStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return window.electronAPI.store.get('token');
}

/**
 * Generic fetch wrapper with authentication
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();

  // Use the native Headers API so we can safely set values regardless of the
  // incoming `options.headers` shape (Headers | string[][] | Record<string,string>).
  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * User API endpoints
 */
export const userApi = {
  /**
   * Get user statistics for the dashboard
   */
  async getStats(): Promise<{ success: boolean; stats: UserStats }> {
    return apiFetch<{ success: boolean; stats: UserStats }>('/api/users/stats');
  },
};

/**
 * Quest API endpoints
 */
export const questApi = {
  /**
   * Get all active quests
   */
  async getQuests(): Promise<{ success: boolean; quests: any[]; total: number }> {
    return apiFetch('/api/quests');
  },

  /**
   * Complete a quest
   */
  async completeQuest({
    quest_id,
    without_reminder,
    notes,
  }: {
    quest_id: number;
    without_reminder: boolean;
    notes?: string;
  }): Promise<{ success: boolean; message: string; coins: number }> {
    return apiFetch('/api/quests/complete', {
      method: 'POST',
      body: JSON.stringify({ quest_id, without_reminder, notes }),
    });
  },
};

/**
 * Reward API endpoints
 */
export const rewardApi = {
  /**
   * Get all active rewards
   */
  async getRewards(): Promise<{ success: boolean; rewards: any[]; total: number }> {
    return apiFetch('/api/rewards');
  },

  /**
   * Purchase a reward
   */
  async purchaseReward(reward_id: number): Promise<{
    success: boolean;
    message: string;
    purchase: any;
  }> {
    return apiFetch('/api/rewards/purchase', {
      method: 'POST',
      body: JSON.stringify({ reward_id }),
    });
  },
};

/**
 * Achievement API endpoints
 */
export const achievementApi = {
  /**
   * Get unlocked achievements
   */
  async getAchievements(): Promise<{ success: boolean; achievements: any[] }> {
    return apiFetch('/api/achievements');
  },
};

/**
 * Activity API endpoints
 */
export const activityApi = {
  /**
   * Get activity feed
   */
  async getActivity(): Promise<{ success: boolean; activity: any[] }> {
    return apiFetch('/api/activity');
  },
};

/**
 * Auth API endpoints
 */
export const authApi = {
  /**
   * Get current user from token
   */
  async getMe(): Promise<{ user: any }> {
    return apiFetch('/api/auth/me');
  },
};

/**
 * Export the generic fetch function for custom requests
 */
export { apiFetch };
