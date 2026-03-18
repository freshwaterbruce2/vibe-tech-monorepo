import type { ShopItem } from '../types';

export const SHOP_ITEMS: ShopItem[] = [
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
