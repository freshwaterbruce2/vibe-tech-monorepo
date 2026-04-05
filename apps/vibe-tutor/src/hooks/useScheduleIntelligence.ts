import { useMemo, useState } from 'react';
import { generateScheduleSuggestion } from '../services/openrouter';
import { getCompletionPatterns, useSchedules } from './useSchedules';

export interface ScheduleSuggestion {
  time: string;
  activity: string;
  durationMinutes: number;
  type: string;
}

export function useScheduleIntelligence() {
  const { chores, goals } = useSchedules();
  const [isGenerating, setIsGenerating] = useState(false);

  const patterns = useMemo(() => getCompletionPatterns(chores, goals), [chores, goals]);

  const totalCompletions = useMemo(
    () => Object.values(patterns).reduce((sum, p) => sum + p.completions, 0),
    [patterns]
  );

  // Top 3 peak hours sorted by completions; fall back to ADHD evidence-based defaults (4–6 PM)
  const peakHours = useMemo((): number[] => {
    if (totalCompletions < 5) return [16, 17, 18];
    return Object.entries(patterns)
      .sort((a, b) => b[1].completions - a[1].completions)
      .slice(0, 3)
      .map(([hour]) => Number(hour))
      .sort((a, b) => a - b);
  }, [patterns, totalCompletions]);

  // Completions + total in the past 7 days
  const weeklyStats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completed = [
      ...chores.filter((c) => c.completed && c.completedAt != null && c.completedAt >= weekAgo),
      ...goals.filter((g) => g.completed && g.completedAt != null && g.completedAt >= weekAgo),
    ].length;
    return { completed, total: chores.length + goals.length };
  }, [chores, goals]);

  // Consecutive days with at least 1 completion (streak)
  const streak = useMemo(() => {
    const uniqueDates = [
      ...chores.filter((c) => c.completed && c.completedAt).map((c) => c.completedAt as number),
      ...goals.filter((g) => g.completed && g.completedAt).map((g) => g.completedAt as number),
    ]
      .map((ts) => new Date(ts).toDateString())
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let count = 0;
    const checkDate = new Date();
    for (const dateStr of uniqueDates) {
      if (dateStr === checkDate.toDateString()) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [chores, goals]);

  const generateSchedule = async (
    energyLevel: 1 | 2 | 3,
    homeworkTitles: string[]
  ): Promise<ScheduleSuggestion[]> => {
    setIsGenerating(true);
    try {
      return await generateScheduleSuggestion({ peakHours, energyLevel, homeworkTitles });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    peakHours,
    weeklyStats,
    streak,
    isGenerating,
    generateSchedule,
    hasEnoughData: totalCompletions >= 5,
  };
}
