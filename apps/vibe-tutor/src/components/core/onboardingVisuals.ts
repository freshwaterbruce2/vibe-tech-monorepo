import { AVATAR_CHARACTERS } from '@vibetech/avatars';

export interface OnboardingAvatarOption {
  id: string;
  imagePath: string;
  name: string;
  subtitle: string;
  gradientClass: string;
}

export const ONBOARDING_BRAND = {
  title: 'Vibe Tutor',
  subtitle: 'Learning with confidence, one step at a time.',
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-sky-500 to-cyan-500',
  'from-indigo-500 to-blue-500',
  'from-pink-500 to-rose-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
] as const;

export const ONBOARDING_AVATARS: OnboardingAvatarOption[] = AVATAR_CHARACTERS.map(
  (character, index) => ({
    id: character.id,
    imagePath: character.imagePath,
    name: character.name,
    subtitle: character.description,
    gradientClass: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
  }),
);
