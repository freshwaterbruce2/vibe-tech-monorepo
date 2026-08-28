import { CheckCircle2, Target, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { dataStore } from '../../services/dataStore';
import type { FocusSession, Goal, HomeworkItem } from '../../types';
import { logger } from '../../utils/logger';

interface GoalsPanelProps {
  homeworkItems: HomeworkItem[];
  tokens: number;
}

const GoalsPanel = ({ homeworkItems, tokens }: GoalsPanelProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [, startTransition] = useTransition();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load goals and focus sessions from dataStore
  useEffect(() => {
    const loadData = async () => {
      try {
        await dataStore.initialize();
        const savedGoals = await dataStore.getUserSettings('user-goals');
        let parsedGoals: Goal[] = [];
        if (savedGoals) {
          parsedGoals = (
            typeof savedGoals === 'string' ? JSON.parse(savedGoals) : savedGoals
          ) as Goal[];
        }
        if (parsedGoals.length === 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOfDay = today.getTime();
          const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000;

          parsedGoals = [
            {
              id: 'daily_focus',
              type: 'daily',
              category: 'focus',
              target: 50,
              current: 0,
              startDate: startOfDay,
              endDate: endOfDay,
              completed: false,
            },
            {
              id: 'daily_tasks',
              type: 'daily',
              category: 'tasks',
              target: 3,
              current: 0,
              startDate: startOfDay,
              endDate: endOfDay,
              completed: false,
            },
            {
              id: 'weekly_focus',
              type: 'weekly',
              category: 'focus',
              target: 300,
              current: 0,
              startDate: startOfWeek.getTime(),
              endDate: endOfWeek,
              completed: false,
            },
            {
              id: 'weekly_points',
              type: 'weekly',
              category: 'points',
              target: 500,
              current: 0,
              startDate: startOfWeek.getTime(),
              endDate: endOfWeek,
              completed: false,
            },
          ];

          await dataStore.saveUserSettings('user-goals', JSON.stringify(parsedGoals));
        }
        const sessions = await dataStore.getFocusSessions();

        startTransition(() => {
          setGoals(parsedGoals);
          setFocusSessions(sessions);
        });
      } catch (error) {
        logger.error('[GoalsPanel] Failed to load data:', error);
      }
    };
    void loadData();
  }, []);

  // Update goals progress
  const updatedGoals = useMemo(() => {
    return goals.map((goal) => {
      // Reset if goal period expired
      if (currentTime > goal.endDate) {
        const newGoal = { ...goal };
        if (goal.type === 'daily') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          newGoal.startDate = today.getTime();
          newGoal.endDate = today.getTime() + 24 * 60 * 60 * 1000;
        } else {
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          newGoal.startDate = startOfWeek.getTime();
          newGoal.endDate = startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000;
        }
        newGoal.current = 0;
        newGoal.completed = false;
        return newGoal;
      }

      let current = 0;

      if (goal.category === 'focus') {
        current = focusSessions
          .filter(
            (s) => s.completed && s.startTime >= goal.startDate && s.startTime <= goal.endDate,
          )
          .reduce((sum, s) => sum + s.duration, 0);
      } else if (goal.category === 'tasks') {
        current = homeworkItems.filter(
          (item) =>
            item.completed &&
            item.completedDate &&
            item.completedDate >= goal.startDate &&
            item.completedDate <= goal.endDate,
        ).length;
      } else if (goal.category === 'points') {
        current = tokens; // Simplified - tracks total tokens
      }

      return {
        ...goal,
        current,
        completed: current >= goal.target,
      };
    });
  }, [goals, focusSessions, homeworkItems, tokens, currentTime]);

  // Save updated goals
  useEffect(() => {
    if (updatedGoals.length > 0) {
      dataStore.saveUserSettings('user-goals', JSON.stringify(updatedGoals)).catch((error) => {
        logger.error('[GoalsPanel] Failed to save goals:', error);
      });
    }
  }, [updatedGoals]);

  const getTimeLeft = (endDate: number): string => {
    const diff = endDate - currentTime;
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h left`;

    const days = Math.floor(hours / 24);
    return `${days}d left`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'focus':
        return Target;
      case 'tasks':
        return CheckCircle2;
      case 'points':
        return Trophy;
      default:
        return Target;
    }
  };

  const getCategoryLabel = (category: string, type: string) => {
    const prefix = type === 'daily' ? 'Daily' : 'Weekly';
    switch (category) {
      case 'focus':
        return `${prefix} Focus`;
      case 'tasks':
        return `${prefix} Tasks`;
      case 'points':
        return `${prefix} Points`;
      default:
        return prefix;
    }
  };

  const getCategoryUnit = (category: string) => {
    switch (category) {
      case 'focus':
        return 'min';
      case 'tasks':
        return 'tasks';
      case 'points':
        return 'pts';
      default:
        return '';
    }
  };

  return (
    <div className="glass-card p-6 space-y-4 border border-[var(--glass-border)]">
      <h3 className="font-bold text-xl flex items-center gap-2">
        <TrendingUp size={20} />
        Goals
      </h3>

      <div className="grid gap-3">
        {updatedGoals.map((goal) => {
          const Icon = getCategoryIcon(goal.category);
          const progress = Math.min((goal.current / goal.target) * 100, 100);

          return (
            <div
              key={goal.id}
              className="glass-card p-4 space-y-2 border border-[var(--glass-border)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    size={18}
                    className={goal.completed ? 'text-violet-400' : 'text-[var(--primary-accent)]'}
                  />
                  <span className="font-semibold text-sm">
                    {getCategoryLabel(goal.category, goal.type)}
                  </span>
                </div>
                <span className="text-xs text-text-secondary">{getTimeLeft(goal.endDate)}</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">
                  {goal.current}
                  <span className="text-sm text-text-secondary ml-1">
                    / {goal.target} {getCategoryUnit(goal.category)}
                  </span>
                </span>
                {goal.completed && <CheckCircle2 size={20} className="text-violet-400" />}
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-[var(--background-surface)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    goal.completed
                      ? 'bg-violet-500'
                      : 'bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-secondary text-center mt-4">
        Goals reset automatically each day/week
      </p>
    </div>
  );
};

export default GoalsPanel;
