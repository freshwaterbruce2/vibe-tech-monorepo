import { Crown, GamepadIcon, Gift, Music, Sparkles, Star, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { appStore } from '../../utils/electronStore';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'avatars' | 'game-passes' | 'perks' | 'real-rewards';
  icon: ReactNode;
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

interface UseRewardShopProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason?: string) => void;
  onPurchaseComplete?: () => void;
}

export function useRewardShop({ userTokens, onSpendTokens, onPurchaseComplete }: UseRewardShopProps) {
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
      color: 'from-purple-500 to-sky-500',
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
      color: 'from-violet-400 to-blue-500',
    },
    {
      id: 'perk-themes',
      name: 'Premium Themes Pack',
      description: 'Unlock 10 exclusive app themes!',
      cost: 150,
      category: 'perks',
      icon: <span className="text-3xl">🎨</span>,
      color: 'from-sky-400 to-purple-500',
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
      color: 'from-red-500 to-sky-500',
      maxQuantity: 1,
    },
    {
      id: 'real-treat',
      name: 'Special Treat',
      description: 'Ice cream or favorite snack!',
      cost: 200,
      category: 'real-rewards',
      icon: <span className="text-3xl">🍦</span>,
      color: 'from-sky-400 to-yellow-400',
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

  return {
    selectedCategory,
    setSelectedCategory,
    purchaseHistory,
    ownedItems,
    showPurchaseAnimation,
    lastPurchasedItem,
    activeAvatar,
    shopItems,
    categories,
    handlePurchase,
    getFilteredItems,
    getPurchaseCount,
    handleEquipAvatar,
  };
}

export type { ShopItem, Purchase };
