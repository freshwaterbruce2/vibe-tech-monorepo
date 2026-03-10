import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../../api/client';
import type { User } from '../../../types';

interface ReportsProps {
  user: User;
}

interface QuestStats {
  today: { quests: number; coins: number };
  week: { quests: number; coins: number };
  byCategory: { category: string; count: number; coins: number }[];
  streaks: { current: number; longest: number };
}

interface RewardStats {
  total_spent: number;
  total_purchases: number;
  pending_purchases: number;
  pending_value: number;
  byCategory: { category: string; count: number; total_cost: number }[];
}

export default function Reports({ user: _user }: ReportsProps) {
  const [questStats, setQuestStats] = useState<QuestStats | null>(null);
  const [rewardStats, setRewardStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quests, rewards] = await Promise.all([
          apiFetch<{ success: boolean; stats: QuestStats }>('/api/quests/stats'),
          apiFetch<{ success: boolean; stats: RewardStats }>('/api/rewards/stats'),
        ]);

        if (quests.success) setQuestStats(quests.stats);
        if (rewards.success) setRewardStats(rewards.stats);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-dark">
        <div className="text-xl text-text-secondary">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pb-20">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-2xl">
              ⬅️
            </Link>
            <h1 className="font-heading text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
            <h3 className="text-sm font-medium text-text-secondary">Coins Earned (Week)</h3>
            <p className="mt-2 text-2xl font-bold text-gold">{questStats?.week.coins || 0} VC</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
            <h3 className="text-sm font-medium text-text-secondary">Quests Completed (Week)</h3>
            <p className="mt-2 text-2xl font-bold text-blue-primary">{questStats?.week.quests || 0}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
            <h3 className="text-sm font-medium text-text-secondary">Total Spent (Lifetime)</h3>
            <p className="mt-2 text-2xl font-bold text-red-400">{rewardStats?.total_spent || 0} VC</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
            <h3 className="text-sm font-medium text-text-secondary">Longest Streak</h3>
            <p className="mt-2 text-2xl font-bold text-orange">{questStats?.streaks.longest || 0} 🔥</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Quest Breakdown */}
          <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
            <h3 className="mb-6 text-xl font-bold text-text-primary">Quest Performance</h3>
            <div className="space-y-4">
              {questStats?.byCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize text-text-primary">{cat.category.replace('_', ' ')}</span>
                    <span className="text-text-secondary">{cat.count} completed</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full bg-blue-primary transition-all"
                      style={{
                        width: `${(cat.count / Math.max(...questStats.byCategory.map((c) => c.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reward Breakdown */}
          <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
            <h3 className="mb-6 text-xl font-bold text-text-primary">Spending Habits</h3>
            <div className="space-y-4">
              {rewardStats?.byCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize text-text-primary">{cat.category}</span>
                    <span className="text-text-secondary">{cat.total_cost} VC</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full bg-green-primary transition-all"
                      style={{
                        width: `${(cat.total_cost / Math.max(...rewardStats.byCategory.map((c) => c.total_cost))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
