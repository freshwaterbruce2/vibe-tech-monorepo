import {
  Check,
  Coins,
  Crown,
  GamepadIcon,
  Gift,
  Lock,
  Music,
  ShoppingCart,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import React, { useState } from 'react';

import { appStore } from '../../utils/electronStore';

interface RobuxRewardShopProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason?: string) => void;
  onPurchaseComplete?: () => void;
  onClose?: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'avatars' | 'game-passes' | 'perks' | 'real-rewards';
  icon: React.ReactNode;
  color: string;
  owned?: boolean;
  quantity?: number;
  maxQuantity?: number;
}

interface Purchase {
  itemId: string;
  date: string;
  cost: number;
}

const RobuxRewardShop = ({
  userTokens,
  onSpendTokens,
  onPurchaseComplete,
  onClose,
}: RobuxRewardShopProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>(() => {
    const savedHistory = appStore.get<Purchase[]>('robuxShop_purchases');
    return savedHistory ?? [];
  });
  const [ownedItems, setOwnedItems] = useState<Set<string>>(() => {
    const savedOwned = appStore.get<string[]>('robuxShop_owned');
    return savedOwned ? new Set(savedOwned) : new Set();
  });
  const [showPurchaseAnimation, setShowPurchaseAnimation] = useState(false);
  const [lastPurchasedItem, setLastPurchasedItem] = useState<ShopItem | null>(null);
  const [activeAvatar, setActiveAvatar] = useState<string>(() => {
    return appStore.get<string>('active_avatar') ?? '';
  });

  // Shop inventory with Roblox-themed items
  const shopItems: ShopItem[] = [
    // Avatar Items
    {
      id: 'avatar-noob',
      name: 'Classic Noob Avatar',
      description: 'The legendary yellow head and blue torso!',
      cost: 50,
      category: 'avatars',
      icon: <span className="text-3xl">👤</span>,
      color: 'from-yellow-400 to-blue-500',
    },
    {
      id: 'avatar-pro',
      name: 'Pro Gamer Avatar',
      description: 'Show everyone you mean business!',
      cost: 150,
      category: 'avatars',
      icon: <span className="text-3xl">😎</span>,
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'avatar-ninja',
      name: 'Shadow Ninja Avatar',
      description: 'Become one with the shadows!',
      cost: 200,
      category: 'avatars',
      icon: <span className="text-3xl">🥷</span>,
      color: 'from-gray-800 to-black',
    },
    {
      id: 'avatar-rainbow',
      name: 'Rainbow Avatar',
      description: 'Shine bright with all the colors!',
      cost: 300,
      category: 'avatars',
      icon: <span className="text-3xl">🌈</span>,
      color: 'from-red-500 via-yellow-500 to-purple-500',
    },

    // Game Passes
    {
      id: 'pass-speed',
      name: '2x Speed Boost',
      description: 'Move twice as fast in all games!',
      cost: 100,
      category: 'game-passes',
      icon: <span className="text-3xl">⚡</span>,
      color: 'from-yellow-400 to-orange-500',
    },
    {
      id: 'pass-jump',
      name: 'Super Jump',
      description: 'Jump 3x higher than normal!',
      cost: 120,
      category: 'game-passes',
      icon: <span className="text-3xl">🚀</span>,
      color: 'from-blue-400 to-cyan-500',
    },
    {
      id: 'pass-vip',
      name: 'VIP Game Access',
      description: 'Unlock exclusive VIP-only games!',
      cost: 500,
      category: 'game-passes',
      icon: <Crown className="w-8 h-8" />,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      id: 'pass-double-rewards',
      name: 'Double Robux Rewards',
      description: 'Earn 2x Robux from all activities!',
      cost: 400,
      category: 'game-passes',
      icon: <span className="text-3xl">💎</span>,
      color: 'from-blue-500 to-purple-600',
    },

    // Special Perks
    {
      id: 'perk-no-ads',
      name: 'Ad-Free Experience',
      description: 'Remove all ads for 30 days!',
      cost: 250,
      category: 'perks',
      icon: <span className="text-3xl">🚫</span>,
      color: 'from-red-500 to-red-600',
    },
    {
      id: 'perk-custom-music',
      name: 'Custom Music Player',
      description: 'Play your own music while studying!',
      cost: 180,
      category: 'perks',
      icon: <Music className="w-8 h-8" />,
      color: 'from-fuchsia-400 to-blue-500',
    },
    {
      id: 'perk-themes',
      name: 'Premium Themes Pack',
      description: 'Unlock 10 exclusive app themes!',
      cost: 150,
      category: 'perks',
      icon: <span className="text-3xl">🎨</span>,
      color: 'from-pink-400 to-purple-500',
    },
    {
      id: 'perk-badges',
      name: 'Special Badge Collection',
      description: 'Show off exclusive achievement badges!',
      cost: 200,
      category: 'perks',
      icon: <Trophy className="w-8 h-8" />,
      color: 'from-amber-400 to-orange-500',
    },

    // Real World Rewards (Parent Approved)
    {
      id: 'real-gaming-time',
      name: '30 Min Extra Gaming',
      description: 'Redeem for extra gaming time! (Parent approval required)',
      cost: 300,
      category: 'real-rewards',
      icon: <GamepadIcon className="w-8 h-8" />,
      color: 'from-purple-500 to-indigo-600',
      maxQuantity: 2,
    },
    {
      id: 'real-movie-night',
      name: 'Movie Night Choice',
      description: 'You pick the movie for family movie night!',
      cost: 400,
      category: 'real-rewards',
      icon: <span className="text-3xl">🎬</span>,
      color: 'from-red-500 to-pink-500',
      maxQuantity: 1,
    },
    {
      id: 'real-treat',
      name: 'Special Treat',
      description: 'Ice cream or favorite snack!',
      cost: 200,
      category: 'real-rewards',
      icon: <span className="text-3xl">🍦</span>,
      color: 'from-pink-400 to-yellow-400',
      maxQuantity: 3,
    },
    {
      id: 'real-later-bedtime',
      name: '30 Min Later Bedtime',
      description: 'Stay up 30 minutes later on weekend!',
      cost: 350,
      category: 'real-rewards',
      icon: <span className="text-3xl">🌙</span>,
      color: 'from-indigo-500 to-purple-600',
      maxQuantity: 1,
    },
    {
      id: 'real-lego-mini',
      name: 'LEGO Mini Set',
      description: 'Redeem for one small LEGO set (family budget rules apply).',
      cost: 500,
      category: 'real-rewards',
      icon: <span className="text-3xl">🧱</span>,
      color: 'from-violet-500 to-purple-600',
      maxQuantity: 1,
    },
    {
      id: 'real-lego-medium',
      name: 'LEGO Medium Set',
      description: 'Redeem for one medium LEGO set with parent approval.',
      cost: 900,
      category: 'real-rewards',
      icon: <span className="text-3xl">🏗️</span>,
      color: 'from-purple-500 to-purple-600',
      maxQuantity: 1,
    },
    {
      id: 'real-family-time',
      name: '45 Min Family Time',
      description: 'One-on-one family activity time: game, walk, or project.',
      cost: 450,
      category: 'real-rewards',
      icon: <span className="text-3xl">👨‍👩‍👧</span>,
      color: 'from-rose-500 to-orange-500',
      maxQuantity: 2,
    },
    {
      id: 'real-family-choice',
      name: 'Choose Family Activity',
      description: 'Pick a weekend family activity from approved options.',
      cost: 650,
      category: 'real-rewards',
      icon: <span className="text-3xl">🎡</span>,
      color: 'from-orange-500 to-amber-500',
      maxQuantity: 1,
    },
  ];

  const categories = [
    { id: 'all', name: 'All Items', icon: <Star className="w-5 h-5" /> },
    { id: 'my-items', name: 'My Items', icon: <Gift className="w-5 h-5" /> },
    { id: 'avatars', name: 'Avatars', icon: <span>👤</span> },
    { id: 'game-passes', name: 'Game Passes', icon: <GamepadIcon className="w-5 h-5" /> },
    { id: 'perks', name: 'Special Perks', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'real-rewards', name: 'Real Rewards', icon: <Gift className="w-5 h-5" /> },
  ];

  const handlePurchase = (item: ShopItem) => {
    if (userTokens < item.cost) return;
    if (ownedItems.has(item.id) && !item.maxQuantity) return;

    // Check quantity limits for real rewards
    if (item.maxQuantity) {
      const purchaseCount = purchaseHistory.filter((p) => p.itemId === item.id).length;
      if (purchaseCount >= item.maxQuantity) return;
    }

    // Process purchase
    onSpendTokens(item.cost, `Shop purchase: ${item.name}`);
    onPurchaseComplete?.();

    // Record purchase
    const newPurchase: Purchase = {
      itemId: item.id,
      date: new Date().toISOString(),
      cost: item.cost,
    };

    const updatedHistory = [...purchaseHistory, newPurchase];
    setPurchaseHistory(updatedHistory);
    appStore.set('robuxShop_purchases', JSON.stringify(updatedHistory));

    // Mark as owned (if not a consumable)
    if (!item.maxQuantity) {
      const updatedOwned = new Set([...ownedItems, item.id]);
      setOwnedItems(updatedOwned);
      appStore.set('robuxShop_owned', JSON.stringify(Array.from(updatedOwned)));
    }

    // Show purchase animation
    setLastPurchasedItem(item);
    setShowPurchaseAnimation(true);
    setTimeout(() => setShowPurchaseAnimation(false), 3000);

    // If it's a real reward, notify parent
    if (item.category === 'real-rewards') {
      const parentNotification = {
        type: 'reward_redeemed',
        item: item.name,
        date: new Date().toISOString(),
      };
      const notifications = appStore.get<Record<string, unknown>[]>('parent_notifications') ?? [];
      notifications.push(parentNotification);
      appStore.set('parent_notifications', JSON.stringify(notifications));
    }
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'all') return shopItems;
    return shopItems.filter((item) => item.category === selectedCategory);
  };

  const getPurchaseCount = (itemId: string) => {
    return purchaseHistory.filter((p) => p.itemId === itemId).length;
  };

  const handleEquipAvatar = (itemId: string) => {
    const newAvatar = activeAvatar === itemId ? '' : itemId;
    setActiveAvatar(newAvatar);
    appStore.set('active_avatar', newAvatar);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-8 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 shrink-0" />
              <span className="truncate">Robux Reward Shop</span>
            </h1>
            <p className="text-white/70 mt-2 text-sm md:text-base">Spend your hard-earned Robux on awesome rewards!</p>
          </div>

          <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-4">
            {/* Balance Display */}
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl px-6 py-4 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <Coins className="w-8 h-8 text-yellow-400 shrink-0" />
                <div className="text-white">
                  <div className="text-sm opacity-70">Your Balance</div>
                  <div className="text-2xl sm:text-3xl font-bold">{userTokens} Robux</div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 sm:py-3 rounded-xl font-bold transition-all w-full sm:w-auto shrink-0"
              >
                Close Shop
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-4 hide-scrollbar snap-x">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-5 py-2.5 rounded-full font-bold transition-all whitespace-nowrap shadow-sm snap-start shrink-0 flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105'
                  : 'bg-gray-800/50 text-gray-300 border border-gray-700 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <div className="shrink-0">{category.icon}</div>
              {category.name}
            </button>
          ))}
        </div>

        {/* My Items Inventory View */}
        {selectedCategory === 'my-items' ? (
          <div>
            {shopItems.filter((item) => ownedItems.has(item.id) || getPurchaseCount(item.id) > 0)
              .length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🛍️</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Items Yet</h3>
                <p className="text-white/60">Purchase items from the shop to see them here!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {shopItems
                  .filter((item) => ownedItems.has(item.id) || getPurchaseCount(item.id) > 0)
                  .map((item) => {
                    const isAvatar = item.category === 'avatars';
                    const isEquipped = isAvatar && activeAvatar === item.id;
                    const purchaseCount = getPurchaseCount(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`relative bg-gray-800/50 backdrop-blur rounded-3xl p-6 border-2 ${
                          isEquipped
                            ? 'border-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.2)]'
                            : 'border-fuchsia-500/50'
                        } transition-all duration-300`}
                      >
                        {/* Badge */}
                        {isEquipped ? (
                          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                            <Crown className="w-4 h-4" />
                            Active
                          </div>
                        ) : (
                          <div className="absolute top-4 right-4 bg-fuchsia-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Owned
                          </div>
                        )}

                        {/* Item Icon */}
                        <div
                          className={`bg-gradient-to-r ${item.color} w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 mx-auto`}
                        >
                          {item.icon}
                        </div>

                        {/* Item Info */}
                        <h3 className="text-xl font-bold text-white mb-2 text-center">
                          {item.name}
                        </h3>
                        <p className="text-white/70 text-sm mb-4 text-center break-words">{item.description}</p>

                        {/* Quantity for consumables */}
                        {item.maxQuantity && (
                          <p className="text-center text-sm text-blue-400 mb-3">
                            Redeemed {purchaseCount}x
                          </p>
                        )}

                        {/* Equip Button for Avatars */}
                        {isAvatar && (
                          <button
                            onClick={() => handleEquipAvatar(item.id)}
                            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                              isEquipped
                                ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105'
                            }`}
                          >
                            {isEquipped ? 'Unequip' : 'Equip Avatar'}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          /* Shop Items Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getFilteredItems().map((item) => {
              const isOwned = ownedItems.has(item.id);
              const purchaseCount = getPurchaseCount(item.id);
              const canPurchase =
                userTokens >= item.cost &&
                (!isOwned || (item.maxQuantity && purchaseCount < item.maxQuantity));

              return (
                <div
                  key={item.id}
                  className={`relative bg-gray-800/50 backdrop-blur rounded-3xl p-6 border-2
                    ${
                      isOwned && !item.maxQuantity
                        ? 'border-fuchsia-500/50'
                        : canPurchase
                          ? 'border-purple-500/50 hover:border-purple-400'
                          : 'border-gray-700 opacity-60'
                    } transition-all duration-300`}
                >
                  {/* Owned Badge */}
                  {isOwned && !item.maxQuantity && (
                    <div className="absolute top-4 right-4 bg-fuchsia-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Owned
                    </div>
                  )}

                  {/* Quantity Badge */}
                  {item.maxQuantity && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {purchaseCount}/{item.maxQuantity}
                    </div>
                  )}

                  {/* Item Icon */}
                  <div
                    className={`bg-gradient-to-r ${item.color} w-20 h-20 rounded-2xl flex items-center justify-center text-white mb-4 mx-auto`}
                  >
                    {item.icon}
                  </div>

                  {/* Item Info */}
                  <h3 className="text-xl font-bold text-white mb-2 text-center">{item.name}</h3>
                  <p className="text-white/70 text-sm mb-4 text-center break-words">{item.description}</p>

                  {/* Price & Purchase Button */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      <span className="text-2xl font-bold text-yellow-400">{item.cost}</span>
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canPurchase}
                      className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                        ${
                          canPurchase
                            ? 'bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white hover:scale-105'
                            : isOwned && !item.maxQuantity
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {isOwned && !item.maxQuantity ? (
                        <>Already Owned</>
                      ) : userTokens < item.cost ? (
                        <>
                          <Lock className="w-5 h-5" />
                          Need {item.cost - userTokens} more
                        </>
                      ) : item.maxQuantity && purchaseCount >= item.maxQuantity ? (
                        <>Max Redeemed</>
                      ) : (
                        <>Purchase</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Purchase Animation */}
        {showPurchaseAnimation && lastPurchasedItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <div className="bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white px-8 py-6 rounded-3xl shadow-2xl animate-bounce max-w-sm w-full text-center">
              <div className="text-3xl font-bold mb-2">🎉 Success!</div>
              <div className="text-xl">Got: {lastPurchasedItem.name}</div>
              {lastPurchasedItem.category === 'real-rewards' && (
                <div className="mt-3 text-sm bg-black/20 rounded-lg p-2 text-fuchsia-100 font-medium">
                  Parent has been notified! ✉️
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-12 bg-gray-800/30 backdrop-blur rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">💡 Shop Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80">
            <div>
              <p className="font-bold mb-1">📚 Study More</p>
              <p className="text-sm">Complete homework and games to earn more Robux!</p>
            </div>
            <div>
              <p className="font-bold mb-1">🎯 Save Up</p>
              <p className="text-sm">The best rewards cost more - save your Robux!</p>
            </div>
            <div>
              <p className="font-bold mb-1">🏆 Real Rewards</p>
              <p className="text-sm">
                Try examples like LEGO sets, family activity choice, or extra family time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobuxRewardShop;
