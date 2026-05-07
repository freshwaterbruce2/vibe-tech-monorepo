import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CelebrationModal from '../../components/CelebrationModal';
import { useCelebration } from '../../hooks/useCelebration';
import type { Quest, QuestCategory, User } from '../../types';

interface QuestsProps {
  user: User;
}

interface QuestCompletionModal {
  quest: Quest;
  isOpen: boolean;
}

const CATEGORY_LABELS: Record<QuestCategory, string> = {
  self_care: 'Self Care',
  household: 'Household',
  self_regulation: 'Self-Regulation',
  social: 'Social',
  spiritual: 'Spiritual',
  academic: 'Academic',
  physical: 'Physical Activity',
  above_beyond: 'Above & Beyond',
};

const CATEGORY_EMOJIS: Record<QuestCategory, string> = {
  self_care: '🪥',
  household: '🧹',
  self_regulation: '🧘',
  social: '🤝',
  spiritual: '🙏',
  academic: '📚',
  physical: '⚽',
  above_beyond: '⭐',
};

export default function Quests({ user }: QuestsProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<QuestCompletionModal | null>(null);
  const [withoutReminder, setWithoutReminder] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    celebration,
    isOpen: celebrationOpen,
    celebrate,
    close: closeCelebration,
  } = useCelebration();

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/quests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch quests');

      const data = await response.json();
      setQuests(data.quests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  };

  const openCompletionModal = (quest: Quest) => {
    setModal({ quest, isOpen: true });
    setWithoutReminder(false);
    setNotes('');
  };

  const closeModal = () => {
    setModal(null);
    setWithoutReminder(false);
    setNotes('');
  };

  const submitCompletion = async () => {
    if (!modal) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/quests/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quest_id: modal.quest.id,
          without_reminder: withoutReminder,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit quest');

      const data = await response.json();

      // Show celebration animation
      celebrate({
        type: 'quest',
        title: 'Quest Submitted!',
        description: `${data.streak} day streak (${data.multiplier}x multiplier)`,
        icon: modal.quest.icon,
        coins: data.coins_pending,
      });

      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit quest');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuests =
    selectedCategory === 'all' ? quests : quests.filter((q) => q.category === selectedCategory);

  const questsByCategory = filteredQuests.reduce(
    (acc, quest) => {
      if (!acc[quest.category]) acc[quest.category] = [];
      acc[quest.category].push(quest);
      return acc;
    },
    {} as Record<QuestCategory, Quest[]>,
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-dark">
        <div className="text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-2 text-text-secondary">Loading quests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-dark">
        <div className="text-center">
          <div className="text-4xl">❌</div>
          <p className="mt-2 text-red-primary">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="font-heading text-2xl font-bold text-blue-primary">Quest Board</h1>
          <div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
            <span className="vibe-coin-static">💰</span>
            <span className="font-bold text-gold">{user.current_coins} VC</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-text-primary">Available Quests</h2>
          <p className="text-text-secondary">
            Complete quests to earn VibeCoins! {quests.length} quests available.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-primary text-white'
                : 'bg-bg-card text-text-secondary hover:bg-blue-primary/20'
            }`}
          >
            All ({quests.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as QuestCategory[]).map((category) => {
            const count = quests.filter((q) => q.category === category).length;
            if (count === 0) return null;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-primary text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-blue-primary/20'
                }`}
              >
                {CATEGORY_EMOJIS[category]} {CATEGORY_LABELS[category]} ({count})
              </button>
            );
          })}
        </div>

        {/* Quest List */}
        {filteredQuests.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
            <p className="text-text-muted">No quests in this category</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(Object.keys(questsByCategory) as QuestCategory[]).map((category) => (
              <div key={category}>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-text-primary">
                  <span className="text-2xl">{CATEGORY_EMOJIS[category]}</span>
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-3">
                  {questsByCategory[category].map((quest) => (
                    <div key={quest.id} className="quest-card">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-1 items-start gap-3">
                          <span className="text-3xl">{quest.icon}</span>
                          <div className="flex-1">
                            <h4 className="mb-1 font-bold text-text-primary">{quest.name}</h4>
                            {quest.description && (
                              <p className="mb-2 text-sm text-text-secondary">
                                {quest.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              {quest.is_daily && (
                                <span className="rounded-full bg-gold/20 px-2 py-1 text-xs font-medium text-gold">
                                  Daily
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-2xl font-bold text-gold">+{quest.bonus_coins} VC</p>
                          <p className="text-xs text-text-muted">(+{quest.base_coins} base)</p>
                          <button
                            onClick={() => openCompletionModal(quest)}
                            className="btn-primary mt-2 text-sm"
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Completion Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-card p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="text-4xl">{modal.quest.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-text-primary">{modal.quest.name}</h3>
                <p className="text-sm text-text-secondary">
                  {CATEGORY_LABELS[modal.quest.category]}
                </p>
              </div>
            </div>

            {modal.quest.description && (
              <p className="mb-4 text-sm text-text-secondary">{modal.quest.description}</p>
            )}

            <div className="mb-4 rounded-lg bg-bg-elevated p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-secondary">Base reward:</span>
                <span className="font-bold text-gold">{modal.quest.base_coins} VC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Without reminder:</span>
                <span className="font-bold text-green-primary">{modal.quest.bonus_coins} VC</span>
              </div>
            </div>

            <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg bg-green-primary/10 p-3 transition-colors hover:bg-green-primary/20">
              <input
                type="checkbox"
                checked={withoutReminder}
                onChange={(e) => setWithoutReminder(e.target.checked)}
                className="h-5 w-5 cursor-pointer rounded border-2 border-green-primary bg-bg-dark checked:bg-green-primary"
              />
              <div className="flex-1">
                <p className="font-bold text-green-primary">
                  I did this without being reminded! 🌟
                </p>
                <p className="text-xs text-text-secondary">
                  Earn {modal.quest.bonus_coins - modal.quest.base_coins} extra coins
                </p>
              </div>
            </label>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-text-secondary">
                Notes (optional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about completing this quest..."
                className="w-full rounded-lg border border-border-subtle bg-bg-dark px-3 py-2 text-text-primary placeholder-text-muted focus:border-blue-primary focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1" disabled={submitting}>
                Cancel
              </button>
              <button
                onClick={submitCompletion}
                className="btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-text-muted">
              Your quest will be reviewed by a parent
            </p>
          </div>
        </div>
      )}

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
          <Link to="/quests" className="flex flex-col items-center text-blue-primary">
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
          <Link
            to="/badges"
            className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
          >
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

      {/* Celebration Modal */}
      {celebration && (
        <CelebrationModal
          isOpen={celebrationOpen}
          onClose={closeCelebration}
          type={celebration.type}
          title={celebration.title}
          description={celebration.description}
          icon={celebration.icon}
          coins={celebration.coins}
          level={celebration.level}
        />
      )}
    </div>
  );
}
