import { Clock, Moon, Sun, Sunrise } from 'lucide-react';
import React, { useMemo } from 'react';
import type { HomeworkItem } from '../../types';

interface StudyTimeInsightProps {
  items: HomeworkItem[];
}

const StudyTimeInsight = ({ items }: StudyTimeInsightProps) => {
  const bestTime = useMemo(() => {
    const completedWithTimes = items.filter(i => i.completed && i.completedDate);

    if (completedWithTimes.length < 3) {
      return { period: 'Not enough data', icon: Clock, color: 'gray', message: 'Complete more tasks to see your best study times!' };
    }

    // Categorize by time of day
    const timeCounts = {
      morning: 0,   // 6am-12pm
      afternoon: 0, // 12pm-6pm
      evening: 0,   // 6pm-11pm
      night: 0      // 11pm-6am
    };

    completedWithTimes.forEach(item => {
      const hour = new Date(item.completedDate as number).getHours();

      if (hour >= 6 && hour < 12) timeCounts.morning++;
      else if (hour >= 12 && hour < 18) timeCounts.afternoon++;
      else if (hour >= 18 && hour < 23) timeCounts.evening++;
      else timeCounts.night++;
    });

    // Find best time
    const max = Math.max(...Object.values(timeCounts));
    const bestPeriod = Object.entries(timeCounts).find(([_, count]) => count === max)?.[0];

    const periodInfo = {
      morning: {
        period: 'Morning (6am-12pm)',
        icon: Sunrise,
        color: 'yellow',
        message: 'You are most productive in the morning! Try tackling tough subjects early.'
      },
      afternoon: {
        period: 'Afternoon (12pm-6pm)',
        icon: Sun,
        color: 'orange',
        message: 'Afternoon is your power time! Use it for challenging assignments.'
      },
      evening: {
        period: 'Evening (6pm-11pm)',
        icon: Moon,
        color: 'blue',
        message: 'Evening works best for you! Plan homework sessions after dinner.'
      },
      night: {
        period: 'Night (11pm-6am)',
        icon: Moon,
        color: 'purple',
        message: 'You are a night owl! Just make sure to get enough sleep.'
      }
    };

    return periodInfo[bestPeriod as keyof typeof periodInfo] ?? periodInfo.morning;
  }, [items]);

  const colorClasses = {
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    gray: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' }
  };

  const colors = colorClasses[bestTime.color as keyof typeof colorClasses];

  return (
    <div className={`glass-card p-6 rounded-2xl border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center gap-3 mb-4">
        <bestTime.icon className={`w-5 h-5 ${colors.text}`} />
        <h3 className="text-lg font-semibold text-white">Best Study Time</h3>
      </div>

      <div className="text-center py-4">
        <p className={`text-2xl font-bold ${colors.text} mb-2`}>{bestTime.period}</p>
        <p className="text-sm text-gray-300">{bestTime.message}</p>
      </div>
    </div>
  );
};

export default StudyTimeInsight;
