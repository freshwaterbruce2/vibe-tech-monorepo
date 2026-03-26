import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import type { HomeworkItem } from '../../types';

interface QuickStatsProps {
  items: HomeworkItem[];
}

const QuickStats = ({ items }: QuickStatsProps) => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Calculate stats
  const completedToday = items.filter(i => {
    if (!i.completed || !i.completedDate) return false;
    const completedDate = new Date(i.completedDate);
    return completedDate.toDateString() === now.toDateString();
  }).length;

  const overdue = items.filter(i => {
    if (i.completed) return false;
    const dueDate = new Date(i.dueDate);
    return dueDate.getTime() < today.getTime();
  }).length;

  const dueToday = items.filter(i => {
    if (i.completed) return false;
    const dueDate = new Date(i.dueDate);
    return dueDate.toDateString() === today.toDateString();
  }).length;

  const completionRate = items.length > 0
    ? Math.round((items.filter(i => i.completed).length / items.length) * 100)
    : 0;

  const stats = [
    {
      icon: CheckCircle2,
      label: 'Completed Today',
      value: completedToday,
      color: 'text-fuchsia-400',
      bgColor: 'bg-fuchsia-500/10',
      borderColor: 'border-fuchsia-500/30'
    },
    {
      icon: Clock,
      label: 'Due Today',
      value: dueToday,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    },
    {
      icon: AlertCircle,
      label: 'Overdue',
      value: overdue,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    },
    {
      icon: TrendingUp,
      label: 'Completion Rate',
      value: `${completionRate}%`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`glass-card p-4 rounded-xl border ${stat.borderColor} ${stat.bgColor} transition-all hover:scale-105`}
          style={{
            animationDelay: `${index * 0.1}s`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;
