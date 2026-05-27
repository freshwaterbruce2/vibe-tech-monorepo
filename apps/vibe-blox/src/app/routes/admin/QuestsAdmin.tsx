import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { questApi } from '../../../api/client';
import type { Quest, User } from '../../../types';

interface QuestsAdminProps {
  user: User;
}

const CATEGORY_LABELS: Record<string, string> = {
  self_care: 'Self Care',
  household: 'Household',
  self_regulation: 'Self-Regulation',
  social: 'Social',
  spiritual: 'Spiritual',
  academic: 'Academic',
  physical: 'Physical Activity',
  above_beyond: 'Above & Beyond',
};

export default function QuestsAdmin({ user: _user }: QuestsAdminProps) {
  const navigate = useNavigate();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    const loadQuests = async () => {
      try {
        const result = await questApi.getAllQuests();
        setQuests(result.quests);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quests');
      } finally {
        setLoading(false);
      }
    };
    loadQuests();
  }, []);

  const handleToggle = async (quest: Quest) => {
    setTogglingId(quest.id);
    try {
      const result = await questApi.toggleQuest(quest.id);
      setQuests((prev) =>
        prev.map((q) => (q.id === result.quest.id ? result.quest : q)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle quest');
    } finally {
      setTogglingId(null);
    }
  };

  const grouped = quests.reduce<Record<string, Quest[]>>((acc, quest) => {
    const key = quest.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(quest);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Back to admin dashboard"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">Manage Quests</h1>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        {loading && (
          <p className="text-center text-text-secondary">Loading quests…</p>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && Object.keys(grouped).length === 0 && (
          <p className="text-center text-text-secondary">No quests found.</p>
        )}

        {Object.entries(grouped).map(([category, categoryQuests]) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-secondary">
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="space-y-2">
              {categoryQuests.map((quest) => (
                <div
                  key={quest.id}
                  className={`quest-card flex items-center justify-between gap-4 transition-opacity ${
                    quest.is_active ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{quest.icon}</span>
                    <div>
                      <p className="font-semibold text-text-primary">{quest.name}</p>
                      {quest.description && (
                        <p className="text-sm text-text-secondary">{quest.description}</p>
                      )}
                      <p className="text-xs text-text-secondary">
                        {quest.base_coins} coins
                        {quest.is_daily ? ' · Daily' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(quest)}
                    disabled={togglingId === quest.id}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      quest.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-border-subtle text-text-secondary hover:bg-green-500/20 hover:text-green-400'
                    }`}
                    aria-label={quest.is_active ? `Disable ${quest.name}` : `Enable ${quest.name}`}
                  >
                    {togglingId === quest.id
                      ? '…'
                      : quest.is_active
                        ? 'Active'
                        : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
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
            to="/admin"
            className="flex flex-col items-center text-blue-primary"
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs font-medium">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
