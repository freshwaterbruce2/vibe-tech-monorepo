import type { HabitDefinition } from './types';

export const STARTER_HABITS: HabitDefinition[] = [
  { id: 'sleep_7plus', dimension: 'physical', label: '7+ hours sleep', enabled: true },
  { id: 'movement', dimension: 'physical', label: 'Intentional movement', enabled: true },
  { id: 'hydration', dimension: 'physical', label: 'Hydration target met', enabled: true },
  { id: 'real_food', dimension: 'physical', label: 'Real food, no junk', enabled: true },

  { id: 'deep_work', dimension: 'mental', label: 'One deep work block', enabled: true },
  { id: 'reading', dimension: 'mental', label: 'Substantive reading', enabled: true },
  { id: 'screen_limit', dimension: 'mental', label: 'Screen time under limit', enabled: true },

  { id: 'human_contact', dimension: 'emotional', label: 'Meaningful human contact', enabled: true },
  { id: 'stress_check', dimension: 'emotional', label: 'Breath work or stress check', enabled: true },
  { id: 'no_doomscroll', dimension: 'emotional', label: 'No doomscrolling', enabled: true },

  { id: 'prayer_meditation', dimension: 'spiritual', label: 'Prayer or meditation (5+ min)', enabled: true },
  { id: 'wisdom_reading', dimension: 'spiritual', label: 'Scripture or wisdom reading', enabled: true },
  { id: 'stillness', dimension: 'spiritual', label: 'Stillness, no input', enabled: true },
];
