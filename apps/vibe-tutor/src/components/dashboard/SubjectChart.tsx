import { PieChart } from 'lucide-react';
import React, { useMemo } from 'react';
import type { HomeworkItem } from '../../types';

interface SubjectChartProps {
  items: HomeworkItem[];
}

const SubjectChart = ({ items }: SubjectChartProps) => {
  const activeItems = items.filter(i => !i.completed);

  const subjectData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeItems.forEach(item => {
      counts[item.subject] = (counts[item.subject] ?? 0) + 1;
    });

    const total = activeItems.length || 1;
    const colors = {
      'Math': 'var(--success-accent)',
      'Science': '#38BDF8',
      'English': '#FF5FD2',
      'History': '#FBBF24',
      'Language': '#a855f7',
      'Language Arts': '#a855f7',
      'Bible': '#FCD34D',
      'Other': 'var(--text-secondary)'
    };

    return Object.entries(counts).map(([subject, count]) => ({
      subject,
      count,
      percentage: Math.round((count / total) * 100),
      color: colors[subject as keyof typeof colors] ?? colors['Other']
    })).sort((a, b) => b.count - a.count);
  }, [activeItems]);

  if (activeItems.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <PieChart className="w-5 h-5 text-[var(--success-accent)]" />
          <h3 className="text-lg font-semibold text-white">Subject Distribution</h3>
        </div>
        <div className="text-center py-8 text-gray-400">
          <p>No active assignments to analyze</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <PieChart className="w-5 h-5 text-[var(--success-accent)]" />
        <h3 className="text-lg font-semibold text-white">Subject Distribution</h3>
      </div>

      <div className="space-y-3">
        {subjectData.map((data, index) => (
          <div
            key={data.subject}
            className="space-y-2"
            style={{
              animationDelay: `${index * 0.1}s`,
              animation: 'fadeInUp 0.6s ease-out forwards'
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-white font-medium">{data.subject}</span>
              <span className="text-gray-400">{data.count} tasks ({data.percentage}%)</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${data.percentage}%`,
                  backgroundColor: data.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectChart;
