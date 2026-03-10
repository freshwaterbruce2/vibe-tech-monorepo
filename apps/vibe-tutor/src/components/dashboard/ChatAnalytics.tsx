import { Activity, BookOpen, Brain, MessageSquare, TrendingUp } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import { dataStore } from '../../services/dataStore';
import { learningAnalytics } from '../../services/learningAnalytics';

interface AnalyticsSnapshot {
  tutorMessageCount: number;
  buddyMessageCount: number;
  bestTimeOfDay: string;
  strongSubjects: string[];
  weakSubjects: string[];
  averageFocusDuration: number;
  learningStyle: string;
  progressTrend: 'improving' | 'stable' | 'declining';
  recommendations: Array<{
    subject: string;
    difficulty: string;
    suggestedDuration: number;
    reason: string;
  }>;
}

const trendConfig = {
  improving: { label: 'Improving 🚀', color: 'text-green-400' },
  stable: { label: 'Steady ✊', color: 'text-yellow-400' },
  declining: { label: 'Needs Attention ⚠️', color: 'text-red-400' },
} as const;

const ChatAnalytics = () => {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      try {
        await dataStore.initialize();

        const [tutorMsgs, buddyMsgs, patterns] = await Promise.all([
          dataStore.getChatHistory('tutor'),
          dataStore.getChatHistory('friend'),
          learningAnalytics.analyzeLearningPatterns(),
        ]);

        const recommendations = await learningAnalytics.generateRecommendations(patterns);

        startTransition(() => {
          setData({
            tutorMessageCount: tutorMsgs?.length ?? 0,
            buddyMessageCount: buddyMsgs?.length ?? 0,
            bestTimeOfDay: patterns.bestTimeOfDay,
            strongSubjects: patterns.strongSubjects,
            weakSubjects: patterns.weakSubjects,
            averageFocusDuration: patterns.averageFocusDuration,
            learningStyle: patterns.learningStyle,
            progressTrend: patterns.progressTrend,
            recommendations: recommendations.slice(0, 3),
          });
        });
      } catch (error) {
        console.error('[ChatAnalytics] Failed to load:', error);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 bg-background-surface border border-[var(--border-color)] rounded-2xl">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] mb-4">
          AI Chat Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-slate-800/50 rounded-lg animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-24 mb-2" />
              <div className="h-8 bg-slate-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trend = trendConfig[data.progressTrend];

  return (
    <div className="p-6 bg-background-surface border border-[var(--border-color)] rounded-2xl">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] mb-4">
        AI Chat Analytics
      </h3>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-[var(--primary-accent)]" />}
          label="Tutor Messages"
          value={data.tutorMessageCount}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-[var(--secondary-accent)]" />}
          label="Buddy Messages"
          value={data.buddyMessageCount}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-blue-400" />}
          label="Avg Focus"
          value={`${data.averageFocusDuration}m`}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Trend"
          value={trend.label}
          valueClass={trend.color}
        />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patterns */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--primary-accent)]" />
            Learning Patterns
          </h4>
          <div className="space-y-2 text-sm">
            <PatternRow label="Best Study Time" value={data.bestTimeOfDay} />
            <PatternRow label="Learning Style" value={capitalize(data.learningStyle)} />
            {data.strongSubjects.length > 0 && (
              <PatternRow label="Strong In" value={data.strongSubjects.join(', ')} />
            )}
            {data.weakSubjects.length > 0 && (
              <PatternRow label="Needs Practice" value={data.weakSubjects.join(', ')} />
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--secondary-accent)]" />
            Recommendations
          </h4>
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-slate-400">
              Keep chatting with Vibe Tutor to unlock personalized tips!
            </p>
          ) : (
            <div className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">{rec.subject}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {rec.difficulty} · {rec.suggestedDuration}m
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

function StatCard({
  icon,
  label,
  value,
  valueClass = 'text-[var(--primary-accent)]',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function PatternRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
      <span className="text-slate-400">{label}</span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default ChatAnalytics;
