export type AvatarRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AvatarStat = 'mathPower' | 'sciencePower' | 'historyPower' | 'logicPower' | 'creativity';
export type AvatarItemType = 'hat' | 'shirt' | 'accessory' | 'avatar' | 'frame' | 'badge' | 'background';

export interface AvatarCharacter {
  id: string;
  name: string;
  imagePath: string;
  rarity: AvatarRarity;
  unlockLevel: number;
  description: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: AvatarItemType;
  statBoosts: Partial<Record<AvatarStat, number>>;
  imageUrl: string;
  rarity?: AvatarRarity;
  twClasses?: string;    // Tailwind classes for frame ring / background gradient overlay
  badgeEmoji?: string;   // Emoji rendered as bottom-right corner badge
}

export interface AvatarPurchaseIntent {
  schemaVersion: 1;
  operationId: string;
  itemId: string;
  cost: number;
  reason: string;
  createdAt: number;
}

export interface AvatarState {
  selectedAvatarId?: string;
  equippedItems: {
    hat?: string;
    shirt?: string;
    accessory?: string;
    frame?: string;
    badge?: string;
    background?: string;
  };
  ownedItems: string[];
  unlockedAvatars: string[];
  purchaseHistory?: Array<{ itemId: string; date: string; cost: number }>;
  pendingPurchase?: AvatarPurchaseIntent;
}
