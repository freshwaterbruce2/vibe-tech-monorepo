import { useCallback, useEffect, useState } from 'react';
import type { AvatarItemType, AvatarState, ShopItem } from '@vibetech/avatars';
import { dataStore } from '../../services/dataStore';
import { appStore } from '../../utils/electronStore';
import {
  DEFAULT_UNLOCKED_AVATAR_IDS,
  SHOP_ITEMS,
  normalizeAvatarId,
} from '../../services/avatarShopData';

function createBaseAvatarState(saved?: Partial<AvatarState> | null, legacyAvatar?: string): AvatarState {
  const selectedAvatarId = normalizeAvatarId(saved?.selectedAvatarId ?? legacyAvatar);
  const unlockedAvatars = new Set([
    ...DEFAULT_UNLOCKED_AVATAR_IDS,
    ...(saved?.unlockedAvatars ?? []),
    selectedAvatarId,
  ]);

  return {
    equippedItems: saved?.equippedItems ?? {},
    ownedItems: saved?.ownedItems ?? [],
    purchaseHistory: saved?.purchaseHistory ?? [],
    selectedAvatarId,
    unlockedAvatars: [...unlockedAvatars],
  };
}

type EquippedSlot = keyof AvatarState['equippedItems'];

const SLOT_FOR_TYPE: Record<AvatarItemType, EquippedSlot | 'selectedAvatarId' | null> = {
  hat: 'hat',
  shirt: 'shirt',
  accessory: 'accessory',
  frame: 'frame',
  badge: 'badge',
  background: 'background',
  avatar: 'selectedAvatarId',
  'real-reward': null,
};

interface UseAvatarShopProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason?: string) => boolean;
  onPurchaseComplete?: () => void;
}

export function useAvatarShop({ userTokens, onSpendTokens, onPurchaseComplete }: UseAvatarShopProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>(() => createBaseAvatarState());
  const [loading, setLoading] = useState(true);
  const [lastPurchased, setLastPurchased] = useState<ShopItem | null>(null);

  useEffect(() => {
    void (async () => {
      const [saved, legacyAvatar] = await Promise.all([
        dataStore.getAvatarState(),
        dataStore.getUserSettings('user_avatar'),
      ]);
      const base = createBaseAvatarState(saved, legacyAvatar);

      // One-time migration: carry forward real-reward purchase history from old appStore keys
      const legacyPurchases = appStore.get<Array<{ itemId: string; date: string; cost: number }>>(
        'vibebuxShop_purchases',
      );
      if (legacyPurchases && legacyPurchases.length > 0) {
        const realOnly = legacyPurchases.filter((p) => p.itemId.startsWith('real-'));
        const merged: AvatarState = {
          ...base,
          purchaseHistory: [...(base.purchaseHistory ?? []), ...realOnly],
        };
        appStore.delete('vibebuxShop_purchases');
        appStore.delete('vibebuxShop_owned');
        appStore.delete('active_avatar');
        await dataStore.saveAvatarState(merged);
        await dataStore.saveUserSettings('user_avatar', merged.selectedAvatarId ?? '');
        setAvatarState(merged);
      } else {
        await dataStore.saveAvatarState(base);
        await dataStore.saveUserSettings('user_avatar', base.selectedAvatarId ?? '');
        setAvatarState(base);
      }

      setLoading(false);
    })();
  }, []);

  const isOwned = useCallback(
    (item: ShopItem): boolean => {
      if (item.type === 'avatar') return avatarState.unlockedAvatars.includes(item.id);
      return avatarState.ownedItems.includes(item.id);
    },
    [avatarState],
  );

  const isEquipped = useCallback(
    (item: ShopItem): boolean => {
      if (item.type === 'avatar') return avatarState.selectedAvatarId === item.id;
      const slot = SLOT_FOR_TYPE[item.type];
      if (!slot || slot === 'selectedAvatarId') return false;
      return avatarState.equippedItems[slot] === item.id;
    },
    [avatarState],
  );

  const purchaseCount = useCallback(
    (itemId: string): number =>
      (avatarState.purchaseHistory ?? []).filter((p) => p.itemId === itemId).length,
    [avatarState.purchaseHistory],
  );

  const canBuy = useCallback(
    (item: ShopItem): boolean => {
      if (userTokens < item.cost) return false;
      if (item.isRealReward) {
        if (!item.maxQuantity) return true;
        return purchaseCount(item.id) < item.maxQuantity;
      }
      return !isOwned(item);
    },
    [userTokens, isOwned, purchaseCount],
  );

  const handleBuy = useCallback(
    async (item: ShopItem) => {
      if (!canBuy(item)) return;
      const spent = onSpendTokens(item.cost, `Bought ${item.name}`);
      if (!spent) return;

      let newState = { ...avatarState };

      if (item.isRealReward) {
        const entry = { itemId: item.id, date: new Date().toISOString(), cost: item.cost };
        newState = { ...newState, purchaseHistory: [...(newState.purchaseHistory ?? []), entry] };
        const notifications = appStore.get<Record<string, unknown>[]>('parent_notifications') ?? [];
        notifications.push({ type: 'reward_redeemed', item: item.name, date: entry.date });
        appStore.set('parent_notifications', JSON.stringify(notifications));
      } else if (item.type === 'avatar') {
        newState = {
          ...newState,
          unlockedAvatars: [...new Set([...newState.unlockedAvatars, item.id])],
        };
        if (!newState.selectedAvatarId) newState = { ...newState, selectedAvatarId: item.id };
      } else {
        newState = { ...newState, ownedItems: [...newState.ownedItems, item.id] };
      }

      setAvatarState(newState);
      await dataStore.saveAvatarState(newState);
      setLastPurchased(item);
      setTimeout(() => { setLastPurchased(null); }, 3000);
      onPurchaseComplete?.();
    },
    [canBuy, onSpendTokens, avatarState, onPurchaseComplete],
  );

  const handleEquip = useCallback(
    async (item: ShopItem) => {
      let newState = { ...avatarState };

      if (item.type === 'avatar') {
        if (!avatarState.unlockedAvatars.includes(item.id)) return;
        newState = { ...newState, selectedAvatarId: item.id };
      } else {
        if (!isOwned(item)) return;
        const slot = SLOT_FOR_TYPE[item.type];
        if (!slot || slot === 'selectedAvatarId') return;
        const currentlyEquipped = newState.equippedItems[slot] === item.id;
        newState = {
          ...newState,
          equippedItems: {
            ...newState.equippedItems,
            [slot]: currentlyEquipped ? undefined : item.id,
          },
        };
      }

      setAvatarState(newState);
      await dataStore.saveAvatarState(newState);
    },
    [avatarState, isOwned],
  );

  return {
    avatarState,
    loading,
    allItems: SHOP_ITEMS,
    lastPurchased,
    isOwned,
    isEquipped,
    canBuy,
    purchaseCount,
    handleBuy,
    handleEquip,
  };
}
