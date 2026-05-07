import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Achievement, Rarity, User } from '../../types';

interface BadgesProps {
  user: User;
}

interface AchievementWithStatus extends Achievement {
  is_unlocked: boolean;
  unlocked_at?: string;
  user_achievement_id?: number;
}

interface AchievementStats {
  total: number;
  unlocked: number;
  locked: number;
  completion_percentage: number;
  by_rarity: Array<{ rarity: Rarity; total: number; unlocked: number }>;
  total_bonus_coins: number;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
  rare: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  epic: 'text-purple border-purple/30 bg-purple/10',
  legendary: 'text-gold border-gold/30 bg-gold/10',
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export default function Badges({ user }: BadgesProps) {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/achievements', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch achievements');

      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/achievements/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load achievement stats:', err);
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.is_unlocked;
    if (filter === 'locked') return !a.is_unlocked;
    return true;
  });

  const achievementsByCategory = filteredAchievements.reduce(
    (acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category]!.push(achievement);
      return acc;
    },
    {} as Record<string, AchievementWithStatus[]>,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark pb-20">
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <h1 className="font-heading text-2xl font-bold text-purple">Achievements</h1>
            <div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
              <span className="vibe-coin-static">💰</span>
              <span className="font-bold text-gold">{user.current_coins} VC</span>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
            <div className="mb-4 text-6xl">🏆</div>
            <p className="text-text-muted">Loading achievements...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-dark pb-20">
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <h1 className="font-heading text-2xl font-bold text-purple">Achievements</h1>
            <div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
              <span className="vibe-coin-static">💰</span>
              <span className="font-bold text-gold">{user.current_coins} VC</span>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pb-20">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="font-heading text-2xl font-bold text-purple">Achievements</h1>
          <div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
            <span className="vibe-coin-static">💰</span>
            <span className="font-bold text-gold">{user.current_coins} VC</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Progress</h3>
              <p className="text-3xl font-bold text-purple">{stats.completion_percentage}%</p>
              <p className="text-xs text-text-muted">
                {stats.unlocked} / {stats.total} unlocked
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Bonus Coins Earned</h3>
              <p className="text-3xl font-bold text-gold">{stats.total_bonus_coins}</p>
              <p className="text-xs text-text-muted">From achievements</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Unlocked</h3>
              <p className="text-3xl font-bold text-green-primary">{stats.unlocked}</p>
              <p className="text-xs text-text-muted">Achievements earned</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-card p-4">
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Remaining</h3>
              <p className="text-3xl font-bold text-blue-primary">{stats.locked}</p>
              <p className="text-xs text-text-muted">Still to unlock</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple text-white'
                : 'bg-bg-card text-text-secondary hover:bg-bg-card/80'
            }`}
          >
            All ({achievements.length})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              filter === 'unlocked'
                ? 'bg-green-primary text-white'
                : 'bg-bg-card text-text-secondary hover:bg-bg-card/80'
            }`}
          >
            Unlocked ({achievements.filter((a) => a.is_unlocked).length})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              filter === 'locked'
                ? 'bg-gray-600 text-white'
                : 'bg-bg-card text-text-secondary hover:bg-bg-card/80'
            }`}
          >
            Locked ({achievements.filter((a) => !a.is_unlocked).length})
          </button>
        </div>

        {/* Achievements by Category */}
        {Object.keys(achievementsByCategory).length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
            <p className="text-text-muted">No achievements in this filter</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
              <div key={category}>
                <h3 className="mb-4 text-xl font-bold capitalize text-text-primary">{category}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`rounded-lg border p-4 transition-all ${
                        achievement.is_unlocked
                          ? `${RARITY_COLORS[achievement.rarity]} hover:scale-105`
                          : 'border-border-subtle bg-bg-card/50 opacity-60 grayscale'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <span className="text-4xl">{achievement.icon}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            achievement.is_unlocked
                              ? RARITY_COLORS[achievement.rarity]
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {RARITY_LABELS[achievement.rarity]}
                        </span>
                      </div>
                      <h4 className="mb-1 font-bold text-text-primary">{achievement.name}</h4>
                      <p className="mb-3 text-sm text-text-secondary">{achievement.description}</p>
                      <div className="flex items-center justify-between">
                        {achievement.bonus_coins > 0 && (
                          <span className="text-sm font-medium text-gold">
                            +{achievement.bonus_coins} VC
                          </span>
                        )}
                        {achievement.is_unlocked && achievement.unlocked_at && (
                          <span className="text-xs text-text-muted">
                            {new Date(achievement.unlocked_at).toLocaleDateString()}
                          </span>
                        )}
                        {!achievement.is_unlocked && (
                          <span className="text-xs text-text-muted">🔒 Locked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border-subtle bg-bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-around px-4 py-3">
          <Link
            to="/"
            className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link
            to="/quests"
            className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
          >
            <span className="text-2xl">📝</span>
            <span className="text-xs font-medium">Quests</span>
          </Link>
          <Link
            to="/shop"
            className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
          >
            <span className="text-2xl">🛍️</span>
            <span className="text-xs font-medium">Shop</span>
          </Link>
          <Link to="/badges" className="flex flex-col items-center text-blue-primary">
            <span className="text-2xl">🏆</span>
            <span className="text-xs font-medium">Badges</span>
          </Link>
          {user.role === 'parent' && (
            <Link
              to="/admin"
              className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-xs font-medium">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
