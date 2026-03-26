import { useCallback, useEffect, useMemo, useState } from 'react';
import ProgressBar from '../ui/ProgressBar';

import type { HomeworkItem } from '../../types';
import { appStore } from '../../utils/electronStore';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: 'homework' | 'break' | 'gaming' | 'focus' | 'meal' | 'routine';
  duration: number; // minutes
  completed: boolean;
  points?: number;
  recurring?: boolean;
  autoComplete?: boolean;
}

interface SmartScheduleProps {
  homework?: HomeworkItem[];
  onTaskComplete?: (taskId: string, points: number) => void;
  onEarnTokens?: (amount: number) => void;
  userTokens?: number;
}

function buildDailySchedule(homework: HomeworkItem[]): ScheduleItem[] {
  const now = new Date();
  const items: ScheduleItem[] = [];

  if (now.getDay() >= 1 && now.getDay() <= 5) {
    items.push(
      {
        id: 'morning-1',
        time: '07:00',
        title: '🌅 Wake Up & Get Ready',
        type: 'routine',
        duration: 30,
        completed: false,
        recurring: true,
      },
      {
        id: 'morning-2',
        time: '07:30',
        title: '🥞 Breakfast',
        type: 'meal',
        duration: 20,
        completed: false,
        recurring: true,
      },
      {
        id: 'morning-3',
        time: '07:50',
        title: '🎒 School Prep',
        type: 'routine',
        duration: 10,
        completed: false,
        recurring: true,
      },
    );
  }

  items.push(
    {
      id: 'after-1',
      time: '15:30',
      title: '🏠 Home from School',
      type: 'routine',
      duration: 15,
      completed: false,
      recurring: true,
    },
    {
      id: 'after-2',
      time: '15:45',
      title: '🍎 Snack Time',
      type: 'meal',
      duration: 15,
      completed: false,
      recurring: true,
    },
    {
      id: 'after-3',
      time: '16:00',
      title: '🎮 Gaming Break',
      type: 'gaming',
      duration: 30,
      completed: false,
      points: 0,
      recurring: true,
    },
  );

  const homeworkSlots = [
    { time: '16:30', slot: 1 },
    { time: '16:50', slot: 2 },
    { time: '17:10', slot: 3 },
    { time: '17:30', slot: 4 },
  ];

  homeworkSlots.forEach((slot, index) => {
    if (index % 2 === 0 && homework[index / 2]) {
      items.push({
        id: `hw-${slot.slot}`,
        time: slot.time,
        title: `📚 ${homework[index / 2]!.title || 'Homework Time'}`,
        type: 'homework',
        duration: 15,
        completed: false,
        points: 25,
        autoComplete: false,
      });
    } else {
      items.push({
        id: `break-${slot.slot}`,
        time: slot.time,
        title: '⚡ Movement Break',
        type: 'break',
        duration: 5,
        completed: false,
        points: 5,
        autoComplete: true,
      });
    }
  });

  items.push(
    {
      id: 'dinner',
      time: '18:00',
      title: '🍽️ Dinner',
      type: 'meal',
      duration: 30,
      completed: false,
      recurring: true,
    },
    {
      id: 'free-1',
      time: '18:30',
      title: '🎮 Free Gaming Time',
      type: 'gaming',
      duration: 60,
      completed: false,
      recurring: true,
    },
    {
      id: 'focus-1',
      time: '19:30',
      title: '📖 Reading/Quiet Time',
      type: 'focus',
      duration: 30,
      completed: false,
      points: 15,
    },
    {
      id: 'evening-1',
      time: '20:00',
      title: '🚿 Shower & PJs',
      type: 'routine',
      duration: 30,
      completed: false,
      recurring: true,
    },
    {
      id: 'evening-2',
      time: '20:30',
      title: '🎮 Bonus Gaming (if all done)',
      type: 'gaming',
      duration: 30,
      completed: false,
      points: 0,
    },
    {
      id: 'bedtime',
      time: '21:00',
      title: '😴 Bedtime Routine',
      type: 'routine',
      duration: 30,
      completed: false,
      recurring: true,
    },
  );

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Blake's Smart Schedule - Automated, predictable, and ADHD/Autism-friendly
 * Automatically creates daily schedule based on patterns and preferences
 */
export const SmartSchedule = ({
  homework = [],
  onTaskComplete,
  onEarnTokens,
  userTokens = 0,
}: SmartScheduleProps) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const saved = appStore.get<ScheduleItem[]>('blake_daily_schedule');
    const savedDate = appStore.get('blake_schedule_date');
    const today = new Date().toDateString();

    if (saved && savedDate === today) {
      return saved;
    }

    const generated = buildDailySchedule(homework);
    appStore.set('blake_daily_schedule', JSON.stringify(generated));
    appStore.set('blake_schedule_date', today);
    return generated;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [autoMode, setAutoMode] = useState(true);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Show completion toast
  const showCompletionToast = useCallback((title: string, points: number) => {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #9333ea, #a855f7);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
        animation: slideInUp 0.5s ease-out;
        z-index: 9999;
        font-weight: bold;
      ">
        ✅ ${title} Complete! +${points} Robux! 💎
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.5s ease-out';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }, []);

  // Complete an activity
  const completeActivity = useCallback(
    (id: string, auto: boolean = false) => {
      setSchedule((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            const completed = { ...item, completed: true };

            // Award points if applicable
            if (item.points && !auto) {
              onTaskComplete?.(id, item.points);

              // Convert points to Robux (1 point = 1 Robux)
              onEarnTokens?.(item.points);

              // Show completion animation
              showCompletionToast(item.title, item.points);
            }

            return completed;
          }
          return item;
        });

        // Save to localStorage
        appStore.set('blake_daily_schedule', JSON.stringify(updated));
        return updated;
      });
    },
    [onTaskComplete, onEarnTokens, showCompletionToast],
  );

  // Auto-complete activities
  useEffect(() => {
    const now = currentTime;

    schedule.forEach((item) => {
      const itemTime = new Date();
      const [hours = '0', minutes = '0'] = item.time.split(':');
      itemTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

      const itemEndTime = new Date(itemTime);
      itemEndTime.setMinutes(itemEndTime.getMinutes() + item.duration);

      // Auto-complete past activities
      if (autoMode && item.autoComplete && itemEndTime < now && !item.completed) {
        completeActivity(item.id, true);
      }
    });
  }, [currentTime, schedule, autoMode, completeActivity]);

  const { currentActivity, nextActivity } = useMemo((): {
    currentActivity: ScheduleItem | null;
    nextActivity: ScheduleItem | null;
  } => {
    const now = currentTime;
    let current: ScheduleItem | null = null;
    let next: ScheduleItem | null = null;

    schedule.forEach((item) => {
      const itemTime = new Date();
      const [hours = '0', minutes = '0'] = item.time.split(':');
      itemTime.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0);

      const itemEndTime = new Date(itemTime);
      itemEndTime.setMinutes(itemEndTime.getMinutes() + item.duration);

      if (itemTime <= now && itemEndTime > now) {
        current = item;
      }

      if (!next && itemTime > now && !item.completed) {
        next = item;
      }
    });

    return { currentActivity: current, nextActivity: next };
  }, [currentTime, schedule]);

  // Get activity color
  const getActivityColor = (type: string) => {
    const colors = {
      homework: 'bg-blue-900/50 border-blue-400',
      break: 'bg-fuchsia-900/50 border-fuchsia-400',
      gaming: 'bg-purple-900/50 border-purple-400',
      focus: 'bg-yellow-900/50 border-yellow-400',
      meal: 'bg-orange-900/50 border-orange-400',
      routine: 'bg-gray-900/50 border-gray-400',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-900/50 border-gray-400';
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    const icons = {
      homework: '📚',
      break: '⚡',
      gaming: '🎮',
      focus: '🎯',
      meal: '🍽️',
      routine: '📋',
    };
    return icons[type as keyof typeof icons] || '📌';
  };

  return (
    <div className="smart-schedule glass-card p-6">
      {/* Header */}
      <div className="header flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Blake's Daily Schedule</h2>
          <p className="text-gray-400">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold text-cyan-400">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              autoMode ? 'bg-violet-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            {autoMode ? '🤖 Auto' : '👤 Manual'}
          </button>
        </div>
      </div>

      {/* Current & Next Activity */}
      <div className="current-next grid grid-cols-2 gap-4 mb-6">
        <div className="current-activity p-4 bg-fuchsia-900/30 border-2 border-fuchsia-400 rounded-lg">
          <div className="text-sm text-fuchsia-400 mb-1">Now</div>
          {currentActivity ? (
            <>
              <div className="text-xl font-bold text-white">{currentActivity.title}</div>
              <div className="text-sm text-gray-400">
                Ends at{' '}
                {(() => {
                  const [h = '0', m = '0'] = currentActivity.time.split(':');
                  const end = new Date();
                  end.setHours(parseInt(h, 10), parseInt(m, 10) + currentActivity.duration);
                  return end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                })()}
              </div>
              {currentActivity.points && (
                <div className="mt-2 text-yellow-400 font-bold">
                  Earn {currentActivity.points} Robux! 💎
                </div>
              )}
            </>
          ) : (
            <div className="text-xl text-gray-500">Free Time</div>
          )}
        </div>

        <div className="next-activity p-4 bg-blue-900/30 border-2 border-blue-400 rounded-lg">
          <div className="text-sm text-blue-400 mb-1">Next Up</div>
          {nextActivity ? (
            <>
              <div className="text-xl font-bold text-white">{nextActivity.title}</div>
              <div className="text-sm text-gray-400">At {nextActivity.time}</div>
              {nextActivity.points && (
                <div className="mt-2 text-yellow-400 font-bold">
                  Worth {nextActivity.points} Robux! 💎
                </div>
              )}
            </>
          ) : (
            <div className="text-xl text-gray-500">All Done!</div>
          )}
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="timeline space-y-2 max-h-96 overflow-y-auto">
        {schedule.map((item, _index) => {
          const isPast = (() => {
            const [h = '0', m = '0'] = item.time.split(':');
            const itemTime = new Date();
            itemTime.setHours(parseInt(h), parseInt(m) + item.duration);
            return itemTime < currentTime;
          })();

          const isCurrent = item === currentActivity;

          return (
            <div
              key={item.id}
              className={`schedule-item flex items-center space-x-4 p-3 rounded-lg border-2 transition-all ${
                item.completed
                  ? 'bg-violet-900/20 border-violet-600 opacity-50'
                  : isCurrent
                    ? 'bg-yellow-900/30 border-yellow-400 scale-105'
                    : getActivityColor(item.type)
              }`}
            >
              {/* Time */}
              <div className="time text-lg font-bold text-gray-400 w-16">{item.time}</div>

              {/* Icon */}
              <div className="icon text-2xl">{getActivityIcon(item.type)}</div>

              {/* Content */}
              <div className="flex-1">
                <div className="font-bold text-white">{item.title}</div>
                <div className="text-sm text-gray-400">
                  {item.duration} min
                  {item.points && ` • ${item.points} Robux`}
                  {item.recurring && ' • Daily'}
                  {item.autoComplete && ' • Auto'}
                </div>
              </div>

              {/* Action */}
              {!item.completed && !isPast && (
                <button
                  onClick={() => completeActivity(item.id)}
                  className="glass-button px-4 py-2 text-sm hover:scale-110"
                >
                  Complete
                </button>
              )}

              {item.completed && <div className="text-fuchsia-400 text-2xl">✅</div>}
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="summary mt-6 p-4 bg-purple-900/30 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-purple-400">Today's Progress</div>
            <div className="text-2xl font-bold text-white">
              {schedule.filter((s) => s.completed).length} / {schedule.length} Complete
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-yellow-400">Robux Earned Today</div>
            <div className="text-2xl font-bold text-yellow-400">
              💎{' '}
              {schedule
                .filter((s) => s.completed && s.points)
                .reduce((sum, s) => sum + (s.points ?? 0), 0)}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total: {userTokens} Robux</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            percent={(schedule.filter((s) => s.completed).length / schedule.length) * 100}
            barClassName="bg-gradient-to-r from-purple-400 to-pink-400"
            trackClassName="h-4 bg-gray-700 rounded-full overflow-hidden"
            label="Daily schedule progress"
          />
        </div>
      </div>
    </div>
  );
};

export default SmartSchedule;
