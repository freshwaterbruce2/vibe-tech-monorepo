import { useCallback, useEffect, useState } from 'react';
import { appStore } from '../utils/electronStore';

export interface ScheduleItem {
  id: string;
  time: string; // e.g., "08:00"
  meridian: 'AM' | 'PM';
  activity: string;
  type: 'custom' | 'weekly' | 'weekend' | 'daytime' | 'nighttime' | 'afternoon';
}

export interface ChoreItem {
  id: string;
  task: string;
  completed: boolean;
  rewardTokens: number;
  completedAt?: number;
}

export interface GoalItem {
  id: string;
  title: string;
  type: 'short-term' | 'long-term';
  completed: boolean;
  dueDate?: string;
  completedAt?: number;
}

/** Returns completion counts keyed by hour-of-day (0–23). */
export function getCompletionPatterns(
  chores: ChoreItem[],
  goals: GoalItem[]
): Record<number, { completions: number }> {
  const patterns: Record<number, { completions: number }> = {};

  const add = (ts: number) => {
    const hour = new Date(ts).getHours();
    patterns[hour] = { completions: (patterns[hour]?.completions ?? 0) + 1 };
  };

  for (const c of chores) {
    if (c.completed && c.completedAt) add(c.completedAt);
  }
  for (const g of goals) {
    if (g.completed && g.completedAt) add(g.completedAt);
  }

  return patterns;
}

interface SchedulesData {
  items: ScheduleItem[];
  chores: ChoreItem[];
  goals: GoalItem[];
}

const DEFAULT_DATA: SchedulesData = {
  items: [],
  chores: [],
  goals: [],
};

function loadSchedulesData(): SchedulesData {
  try {
    const saved = appStore.get<SchedulesData>('vibe_schedules_data');
    if (saved) {
      return { ...DEFAULT_DATA, ...saved };
    }
  } catch {
    // ignore
  }
  return DEFAULT_DATA;
}

function saveSchedulesData(data: SchedulesData) {
  appStore.set('vibe_schedules_data', data);
}

// Generate an ID hook or helper
const generateId = () => Math.random().toString(36).substr(2, 9);

export function useSchedules() {
  const [data, setData] = useState<SchedulesData>(loadSchedulesData);

  useEffect(() => {
    saveSchedulesData(data);
  }, [data]);

  const addScheduleItem = useCallback((item: Omit<ScheduleItem, 'id'>) => {
    setData((prev) => ({
      ...prev,
      items: [...prev.items, { ...item, id: generateId() }].sort((a, b) => {
        // Sort primarily by time (roughly)
        return a.time.localeCompare(b.time);
      }),
    }));
  }, []);

  const removeScheduleItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
    }));
  }, []);

  const addChore = useCallback((chore: Omit<ChoreItem, 'id' | 'completed'>) => {
    setData((prev) => ({
      ...prev,
      chores: [...prev.chores, { ...chore, id: generateId(), completed: false }],
    }));
  }, []);

  const toggleChore = useCallback((id: string) => {
    let earnedTokens = 0;
    setData((prev) => {
      const updatedChores = prev.chores.map((c) => {
        if (c.id === id) {
          if (!c.completed) earnedTokens = c.rewardTokens; // earn when checking
          return {
            ...c,
            completed: !c.completed,
            completedAt: !c.completed ? Date.now() : undefined,
          };
        }
        return c;
      });
      return { ...prev, chores: updatedChores };
    });
    return earnedTokens;
  }, []);

  const removeChore = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      chores: prev.chores.filter((c) => c.id !== id),
    }));
  }, []);

  const addGoal = useCallback((goal: Omit<GoalItem, 'id' | 'completed'>) => {
    setData((prev) => ({
      ...prev,
      goals: [...prev.goals, { ...goal, id: generateId(), completed: false }],
    }));
  }, []);

  const toggleGoal = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === id
          ? { ...g, completed: !g.completed, completedAt: !g.completed ? Date.now() : undefined }
          : g
      ),
    }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }, []);

  return {
    ...data,
    addScheduleItem,
    removeScheduleItem,
    addChore,
    toggleChore,
    removeChore,
    addGoal,
    toggleGoal,
    removeGoal,
  };
}
