export interface OnboardingAvatarOption {
  id: string;
  emoji: string;
  name: string;
  subtitle: string;
  gradientClass: string;
}

export const ONBOARDING_BRAND = {
  title: 'Vibe Tutor',
  subtitle: 'Learning with confidence, one step at a time.',
};

export const ONBOARDING_AVATARS: OnboardingAvatarOption[] = [
  {
    id: 'focus-dragon',
    emoji: '🐉',
    name: 'Focus Dragon',
    subtitle: 'Bold and determined',
    gradientClass: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'swift-fox',
    emoji: '🦊',
    name: 'Swift Fox',
    subtitle: 'Quick and clever',
    gradientClass: 'from-orange-500 to-amber-500',
  },
  {
    id: 'calm-cat',
    emoji: '🐱',
    name: 'Calm Cat',
    subtitle: 'Steady and thoughtful',
    gradientClass: 'from-sky-500 to-cyan-500',
  },
  {
    id: 'dream-unicorn',
    emoji: '🦄',
    name: 'Dream Unicorn',
    subtitle: 'Creative and bright',
    gradientClass: 'from-pink-500 to-rose-500',
  },
  {
    id: 'rocket-spark',
    emoji: '🚀',
    name: 'Rocket Spark',
    subtitle: 'Curious and brave',
    gradientClass: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'game-hero',
    emoji: '🎮',
    name: 'Game Hero',
    subtitle: 'Playful and sharp',
    gradientClass: 'from-emerald-500 to-teal-500',
  },
];
