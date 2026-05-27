import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CelebrationModal from '../../components/CelebrationModal';
import { useCelebration } from '../../hooks/useCelebration';
import type { Rarity, Reward, RewardCategory, User } from '../../types';

interface ShopProps {
  user: User;
}

interface PurchaseModal {
  reward: Reward;
  isOpen: boolean;
}

const CATEGORY_LABELS: Record<RewardCategory, string> = {
  robux: 'Robux',
  gaming: 'Gaming Time',
  lego: 'LEGO Sets',
  experience: 'Experiences',
};

const CATEGORY_EMOJIS: Record<RewardCategory, string> = {
  robux: '💎',
  gaming: '🎮',
  lego: '🧱',
  experience: '🎢',
};

const RARITY_COLORS: Record<Rarity, string> = {
  common: 'border-gray-500',
  rare: 'border-blue-primary',
  epic: 'border-purple',
  legendary: 'border-gold',
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

export default function Shop({ user }: ShopProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<PurchaseModal | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const {
    celebration,
    isOpen: celebrationOpen,
    celebrate,
    close: closeCelebration,
  } = useCelebration();

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/rewards', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch rewards');

      const data = await response.json();
      setRewards(data.rewards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const openPurchaseModal = (reward: Reward) => {
    setModal({ reward, isOpen: true });
  };

  const closeModal = () => {
    setModal(null);
  };

  const submitPurchase = async () => {
    if (!modal) return;

    setPurchasing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/rewards/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reward_id: modal.reward.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase reward');
      }

      // Show celebration animation
      celebrate({
        type: 'purchase',
        title: 'Purchase Submitted!',
        description: data.message,
        icon: modal.reward.icon,
        coins: -data.pending_cost,
      });

      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to purchase reward');
    } finally {
      setPurchasing(false);
    }
  };

  const filteredRewards =
    selectedCategory === 'all' ? rewards : rewards.filter((r) => r.category === selectedCategory);

  const rewardsByCategory = filteredRewards.reduce(
    (acc, reward) => {
      if (!acc[reward.category]) acc[reward.category] = [];
      acc[reward.category].push(reward);
      return acc;
    },
    {} as Record<RewardCategory, Reward[]>,
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-dark">
        <div className="text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-2 text-text-secondary">Loading shop...</p>
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
          <h1 className="font-heading text-2xl font-bold text-green-primary">Vibe Shop</h1>
          <div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
            <span className="vibe-coin-static">💰</span>
            <span className="font-bold text-gold">{user.current_coins} VC</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-text-primary">Spend Your Coins!</h2>
          <p className="text-text-secondary">
            Buy Robux, gaming time, LEGO, and more. {rewards.length} rewards available.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-green-primary text-white'
                : 'bg-bg-card text-text-secondary hover:bg-green-primary/20'
            }`}
          >
            All ({rewards.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as RewardCategory[]).map((category) => {
            const count = rewards.filter((r) => r.category === category).length;
            if (count === 0) return null;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-green-primary text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-green-primary/20'
                }`}
              >
                {CATEGORY_EMOJIS[category]} {CATEGORY_LABELS[category]} ({count})
              </button>
            );
          })}
        </div>

        {/* Rewards Grid */}
        {filteredRewards.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
            <p className="text-text-muted">No rewards in this category</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(Object.keys(rewardsByCategory) as RewardCategory[]).map((category) => (
              <div key={category}>
                <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-text-primary">
                  <span className="text-3xl">{CATEGORY_EMOJIS[category]}</span>
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rewardsByCategory[category].map((reward) => {
                    const canAfford = user.current_coins >= reward.cost;
                    const shortfall = canAfford ? 0 : reward.cost - user.current_coins;

                    return (
                      <div
                        key={reward.id}
                        className={`reward-card relative ${RARITY_COLORS[reward.rarity]}`}
                      >
                        <div className="absolute right-2 top-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              reward.rarity === 'legendary'
                                ? 'bg-gold text-bg-dark'
                                : reward.rarity === 'epic'
                                  ? 'bg-purple text-white'
                                  : reward.rarity === 'rare'
                                    ? 'bg-blue-primary text-white'
                                    : 'bg-gray-500 text-white'
                            }`}
                          >
                            {RARITY_LABELS[reward.rarity]}
                          </span>
                        </div>
                        <div className="mb-4 text-center text-5xl">{reward.icon}</div>
                        <h4 className="mb-2 text-center font-bold text-text-primary">
                          {reward.name}
                        </h4>
                        {reward.description && (
                          <p className="mb-4 text-center text-sm text-text-secondary">
                            {reward.description}
                          </p>
                        )}
                        {reward.real_value && (
                          <div className="mb-4 text-center text-xs text-text-muted">
                            ~{reward.real_value} value
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-gold">🪙 {reward.cost} VC</span>
                          <button
                            onClick={() => openPurchaseModal(reward)}
                            disabled={!canAfford}
                            className="btn-secondary text-sm disabled:opacity-50"
                          >
                            {canAfford ? 'Purchase' : `Need ${shortfall} more`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Purchase Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-card p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="text-5xl">{modal.reward.icon}</span>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text-primary">{modal.reward.name}</h3>
                <p className="text-sm text-text-secondary">
                  {CATEGORY_LABELS[modal.reward.category]}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${
                  modal.reward.rarity === 'legendary'
                    ? 'bg-gold text-bg-dark'
                    : modal.reward.rarity === 'epic'
                      ? 'bg-purple text-white'
                      : modal.reward.rarity === 'rare'
                        ? 'bg-blue-primary text-white'
                        : 'bg-gray-500 text-white'
                }`}
              >
                {RARITY_LABELS[modal.reward.rarity]}
              </span>
            </div>

            {modal.reward.description && (
              <p className="mb-4 text-sm text-text-secondary">{modal.reward.description}</p>
            )}

            {modal.reward.real_value && (
              <div className="mb-4 rounded-lg bg-bg-elevated p-3">
                <p className="text-sm text-text-secondary">
                  <span className="font-medium">Real value:</span> {modal.reward.real_value}
                </p>
              </div>
            )}

            <div className="mb-4 rounded-lg bg-bg-elevated p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-secondary">Cost:</span>
                <span className="text-2xl font-bold text-gold">{modal.reward.cost} VC</span>
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                <span className="text-sm text-text-secondary">Your balance:</span>
                <span className="font-bold text-text-primary">{user.current_coins} VC</span>
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                <span className="text-sm text-text-secondary">After purchase:</span>
                <span
                  className={`font-bold ${user.current_coins - modal.reward.cost >= 0 ? 'text-green-primary' : 'text-red-primary'}`}
                >
                  {user.current_coins - modal.reward.cost} VC
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1" disabled={purchasing}>
                Cancel
              </button>
              <button onClick={submitPurchase} className="btn-primary flex-1" disabled={purchasing}>
                {purchasing ? 'Purchasing...' : 'Confirm Purchase'}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-text-muted">
              Your purchase will be reviewed by a parent
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
          <Link
            to="/quests"
            className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
          >
            <span className="text-2xl">📝</span>
            <span className="text-xs font-medium">Quests</span>
          </Link>
          <Link to="/shop" className="flex flex-col items-center text-green-primary">
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
