import React, { useMemo, useState, useEffect, useTransition } from 'react';
import { TrendingUp } from 'lucide-react';
import type { HomeworkItem, FocusSession } from '../../types';
import { dataStore } from '../../services/dataStore';

interface WeekProgressProps {
  homeworkItems: HomeworkItem[];
}

const WeekProgress = ({ homeworkItems }: WeekProgressProps) => {
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [, startTransition] = useTransition();

  // Load focus sessions from dataStore
  useEffect(() => {
    const loadSessions = async () => {
      try {
        await dataStore.initialize();
        const sessions = await dataStore.getFocusSessions();
        startTransition(() => setFocusSessions(sessions));
      } catch (error) {
        console.error('[WeekProgress] Failed to load sessions:', error);
      }
    };
    void loadSessions();
  }, []);

  const weekData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    });

    return last7Days.map(dayStart => {
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const daySessions = focusSessions.filter(s =>
        s.startTime >= dayStart && s.startTime < dayEnd && s.completed
      );

      const dayTasks = homeworkItems.filter(item =>
        item.completedDate && item.completedDate >= dayStart && item.completedDate < dayEnd
      );

      return {
        date: new Date(dayStart).toLocaleDateString('en', { weekday: 'short' }),
        focusMinutes: daySessions.reduce((sum, s) => sum + s.duration, 0),
        tasksCompleted: dayTasks.length
      };
    });
  }, [focusSessions, homeworkItems]);

  const maxMinutes = Math.max(...weekData.map(d => d.focusMinutes), 1);

  return (
    <div className="glass-panel p-6 space-y-4">
      <h3 className="font-bold text-xl flex items-center gap-2">
        <TrendingUp size={20} />
        Your Week
      </h3>

      <div className="flex items-end justify-around h-32 gap-2">
        {weekData.map((day, i) => {
          const height = (day.focusMinutes / maxMinutes) * 100;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full relative group">
                <div
                  className="w-full bg-gradient-to-t from-[var(--primary-accent)] to-[var(--secondary-accent)] rounded-t-lg transition-all duration-500"
                  style={{ height: `${height}%`, minHeight: day.focusMinutes > 0 ? '8px' : '0' }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-dark rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {day.focusMinutes}m • {day.tasksCompleted} tasks
                </div>
              </div>
              <span className="text-xs">{day.date}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="glass-panel p-3">
          <p className="text-text-secondary">Total Focus</p>
          <p className="text-xl font-bold">{weekData.reduce((s, d) => s + d.focusMinutes, 0)}m</p>
        </div>
        <div className="glass-panel p-3">
          <p className="text-text-secondary">Tasks Done</p>
          <p className="text-xl font-bold">{weekData.reduce((s, d) => s + d.tasksCompleted, 0)}</p>
        </div>
      </div>
    </div>
  );
};

export default WeekProgress;
