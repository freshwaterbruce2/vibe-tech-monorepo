import { useNotifications } from '@/context/NotificationsContext';
import { toast } from '@/hooks/use-toast';
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useRef } from 'react';
import type { SystemActivity, SystemMetrics } from './types';

/** Shape returned by the Rust get_recent_activities command */
interface BackendActivity {
  id: number;
  timestamp: number;
  activity_type: string;
  details: string | null;
  metadata: string | null;
}

/** Shape returned by the Rust get_task_stats command */
type TaskStats = Record<string, number>;

/** Map backend activity_type to the UI activity type */
function mapActivityType(backendType: string): SystemActivity['type'] {
  switch (backendType) {
    case 'analysis':
      return 'analysis';
    case 'execution':
    case 'deep_work':
      return 'execution';
    case 'memory':
    case 'learning':
      return 'memory';
    case 'network':
    case 'sync':
      return 'network';
    default:
      return 'execution';
  }
}

/** Map backend activity to UI SystemActivity */
function toSystemActivity(a: BackendActivity): SystemActivity {
  return {
    id: a.id,
    description: a.details ?? a.activity_type,
    type: mapActivityType(a.activity_type),
    timestamp: new Date(a.timestamp * 1000).toISOString(),
    status: 'success',
  };
}

export const useDashboardRefresh = (
  setActivities: React.Dispatch<React.SetStateAction<SystemActivity[]>>,
  setMetrics: React.Dispatch<React.SetStateAction<SystemMetrics>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  // Refs for tracking state
  const isInitialLoadRef = useRef(true);
  const isManualRefreshRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const { addNotification } = useNotifications();

  // Data loading function - calls real Tauri backend
  const loadDashboardData = useCallback(async () => {
    // Set manual refresh flag if it's not the initial load
    if (!isInitialLoadRef.current) {
      isManualRefreshRef.current = true;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch real data from Tauri backend in parallel
      const [rawActivities, taskStats, todayCount] = await Promise.all([
        invoke<BackendActivity[]>('get_recent_activities', {
          limit: 20,
          activityTypeFilter: null,
        }),
        invoke<TaskStats>('get_task_stats').catch(() => ({}) as TaskStats),
        invoke<number>('get_today_activity_count').catch(() => 0),
      ]);

      // Transform backend activities to UI shape
      const activities = rawActivities.map(toSystemActivity);
      setActivities(activities);

      // Build metrics from real task stats
      const completedCount = (taskStats['completed'] ?? 0) + (taskStats['done'] ?? 0);
      const activeContexts = todayCount;

      // Compute uptime from earliest activity timestamp
      let uptimeStr = '0h';
      if (rawActivities.length > 0) {
        const earliest = rawActivities[rawActivities.length - 1];
        if (earliest) {
          const nowSec = Math.floor(Date.now() / 1000);
          const diffSec = nowSec - earliest.timestamp;
          const days = Math.floor(diffSec / 86400);
          const hours = Math.floor((diffSec % 86400) / 3600);
          uptimeStr = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
        }
      }

      setMetrics({
        activeContexts,
        tasksCompleted: completedCount,
        uptime: uptimeStr,
        memoryUsage: '--',
        cpuUsage: '--',
      });

      // Mark data as loaded
      dataLoadedRef.current = true;

      // Only show notifications if it's a manual refresh (not the initial load)
      if (!isInitialLoadRef.current && isManualRefreshRef.current) {
        addNotification({
          title: 'Dashboard Updated',
          message: 'Your dashboard data has been refreshed from the backend',
          type: 'success',
        });

        toast({
          title: 'Dashboard refreshed',
          description: 'Your dashboard data has been updated successfully.',
        });

        isManualRefreshRef.current = false;
      }

      isInitialLoadRef.current = false;
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load dashboard data: ${message}`);

      if (!isInitialLoadRef.current && isManualRefreshRef.current) {
        toast({
          variant: 'destructive',
          title: 'Error loading dashboard',
          description: 'Could not load your dashboard data. Please try again.',
        });

        addNotification({
          title: 'Dashboard Error',
          message: 'Failed to load dashboard data. Please try again.',
          type: 'error',
        });

        isManualRefreshRef.current = false;
      }

      isInitialLoadRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, setError, setIsLoading, setActivities, setMetrics]);

  return { loadDashboardData, isInitialLoadRef, dataLoadedRef };
};
