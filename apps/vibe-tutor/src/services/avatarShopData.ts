import {
  AVATAR_CHARACTERS,
  BACKGROUND_ITEMS,
  BADGE_ITEMS,
  FRAME_ITEMS,
  type ShopItem,
} from '@vibetech/avatars';

const LEGACY_AVATAR_VALUE_TO_ID: Record<string, string> = {
  '🐉': 'avatar-boy-headphones',
  '🦊': 'avatar-girl-glasses',
  '🐱': 'avatar-teen-cap',
  '🦄': 'avatar-teen-neon-hair',
  '🚀': 'avatar-ai-buddy',
  '🎮': 'avatar-calm-reader',
  'focus-dragon': 'avatar-boy-headphones',
  'swift-fox': 'avatar-girl-glasses',
  'calm-cat': 'avatar-teen-cap',
  'dream-unicorn': 'avatar-teen-neon-hair',
  'rocket-spark': 'avatar-ai-buddy',
  'game-hero': 'avatar-calm-reader',
};

export const AVATAR_CHARACTER_ITEMS: ShopItem[] = AVATAR_CHARACTERS.map((character) => ({
  id: character.id,
  name: character.name,
  description: character.description,
  cost: 0,
  type: 'avatar',
  statBoosts: {},
  imageUrl: character.imagePath,
  rarity: character.rarity,
}));

export const DEFAULT_AVATAR_ID = AVATAR_CHARACTER_ITEMS[0]?.id ?? 'avatar-boy-headphones';
export const DEFAULT_UNLOCKED_AVATAR_IDS = AVATAR_CHARACTER_ITEMS.map((item) => item.id);

const KNOWN_AVATAR_IDS = new Set(DEFAULT_UNLOCKED_AVATAR_IDS);

export function normalizeAvatarId(value: string | null | undefined): string {
  if (!value) return DEFAULT_AVATAR_ID;
  if (KNOWN_AVATAR_IDS.has(value)) return value;
  return LEGACY_AVATAR_VALUE_TO_ID[value] ?? DEFAULT_AVATAR_ID;
}

const GEAR_ITEMS: ShopItem[] = [
  {
    id: 'hat-math',
    name: "Mathematician's Cap",
    description: 'Increases Math Power significantly in Boss Battles.',
    cost: 100,
    type: 'hat',
    statBoosts: { mathPower: 5 },
    imageUrl: '🧢', // simple emoji placeholder
  },
  {
    id: 'hat-history',
    name: "Historian's Helmet",
    description: 'Increases History Power to recall past events.',
    cost: 120,
    type: 'hat',
    statBoosts: { historyPower: 6 },
    imageUrl: '🪖',
  },
  {
    id: 'hat-science',
    name: 'Lab Goggles',
    description: 'Protect your eyes while increasing Science Power.',
    cost: 150,
    type: 'hat',
    statBoosts: { sciencePower: 7 },
    imageUrl: '🥽',
  },
  {
    id: 'shirt-adventurer',
    name: "Adventurer's Tunic",
    description: 'An all-around balanced shirt for any subject.',
    cost: 200,
    type: 'shirt',
    statBoosts: { mathPower: 2, sciencePower: 2, historyPower: 2, logicPower: 2 },
    imageUrl: '👕',
  },
  {
    id: 'shirt-logic',
    name: "Philosopher's Robe",
    description: 'Greatly increases Logic Power for deep thinking.',
    cost: 250,
    type: 'shirt',
    statBoosts: { logicPower: 8 },
    imageUrl: '👘',
  },
  {
    id: 'acc-creativity',
    name: "Artist's Palette",
    description: 'Boosts your Creative stats.',
    cost: 180,
    type: 'accessory',
    statBoosts: { creativity: 10 },
    imageUrl: '🎨',
  },
  {
    id: 'acc-language',
    name: "Writer's Quill",
    description: 'Boosts your mastery of Language Arts.',
    cost: 150,
    type: 'accessory',
    statBoosts: { logicPower: 5, creativity: 3 }, // using logic/creativity for language arts proxy
    imageUrl: '✒️',
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  ...AVATAR_CHARACTER_ITEMS,
  ...GEAR_ITEMS,
  ...FRAME_ITEMS,
  ...BADGE_ITEMS,
  ...BACKGROUND_ITEMS,
];
