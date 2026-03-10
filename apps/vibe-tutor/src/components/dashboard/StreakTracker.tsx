import { Calendar, Flame } from 'lucide-react';
import React, { useMemo } from 'react';
import type { HomeworkItem } from '../../types';

interface StreakTrackerProps {
  items: HomeworkItem[];
}

const StreakTracker = ({ items }: StreakTrackerProps) => {
  const { currentStreak, longestStreak } = useMemo(() => {
    const completedDates = items
      .filter((i) => i.completed && i.completedDate)
      .map((i) => {
        const date = new Date(i.completedDate as number);
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).getTime();
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => b - a);

    if (completedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let streak = 0;
    let checkDate = today;

    while (completedDates.includes(checkDate)) {
      streak++;
      checkDate -= oneDayMs;
    }

    let longest = 0;
    let tempStreak = 1;

    for (let i = 0; i < completedDates.length - 1; i++) {
      const current = completedDates[i];
      const next = completedDates[i + 1];
      if (current !== undefined && next !== undefined && current - next === oneDayMs) {
        tempStreak++;
      } else {
        longest = Math.max(longest, tempStreak);
        tempStreak = 1;
      }
    }
    longest = Math.max(longest, tempStreak);
    return { currentStreak: streak, longestStreak: Math.max(longest, streak) };
  }, [items]);

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-5 h-5 text-orange-400" />
        <h3 className="text-lg font-semibold text-white">Daily Streak</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-6 h-6 text-orange-400" />
            <span className="text-3xl font-bold text-orange-400">{currentStreak}</span>
          </div>
          <p className="text-xs text-gray-400">Current Streak</p>
          <p className="text-xs text-gray-500 mt-1">
            {currentStreak === 0
              ? 'Complete a task today!'
              : currentStreak === 1
                ? 'Keep it going!'
                : 'Amazing consistency!'}
          </p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            <span className="text-3xl font-bold text-purple-400">{longestStreak}</span>
          </div>
          <p className="text-xs text-gray-400">Best Streak</p>
          <p className="text-xs text-gray-500 mt-1">
            {longestStreak === 0
              ? 'Start your journey!'
              : longestStreak === currentStreak
                ? 'New record!'
                : 'Can you beat it?'}
          </p>
        </div>
      </div>

      {currentStreak >= 3 && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400 text-center">
            🔥 {currentStreak} days strong! You're building great habits!
          </p>
        </div>
      )}
    </div>
  );
};

export default StreakTracker;
