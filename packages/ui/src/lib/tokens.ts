/**
 * Design token constants for @vibetech/ui.
 *
 * These are NOT runtime CSS — they're JS constants for tooling,
 * documentation, and programmatic access to the token system.
 */

/** Canonical shadcn/ui CSS custom property names (without `--` prefix). */
export const TOKEN_NAMES = {
  background: 'background',
  foreground: 'foreground',
  card: 'card',
  cardForeground: 'card-foreground',
  popover: 'popover',
  popoverForeground: 'popover-foreground',
  primary: 'primary',
  primaryForeground: 'primary-foreground',
  secondary: 'secondary',
  secondaryForeground: 'secondary-foreground',
  muted: 'muted',
  mutedForeground: 'muted-foreground',
  accent: 'accent',
  accentForeground: 'accent-foreground',
  destructive: 'destructive',
  destructiveForeground: 'destructive-foreground',
  border: 'border',
  input: 'input',
  ring: 'ring',
  radius: 'radius',
} as const;

export type TokenName = (typeof TOKEN_NAMES)[keyof typeof TOKEN_NAMES];

/**
 * Vibe Tech canonical reference palette.
 *
 * Consumer apps are free to override every token. This preset
 * captures the "Cognitive Future / Neural Nexus" dark-mode palette
 * documented in the Vibe Tech Premium Design System.
 */
export const VIBE_PRESET = {
  colors: {
    midnightBlue: { hex: '#080c14', hsl: '220 30% 5%' },
    neonCyan: { hex: '#00f2ff', hsl: '183 100% 50%' },
    electricMagenta: { hex: '#ff00fb', hsl: '301 100% 50%' },
  },
  /** HSL values (space-separated, no `hsl()` wrapper) for shadcn tokens. */
  shadcn: {
    background: '220 30% 5%',
    foreground: '220 20% 98%',
    card: '220 30% 7%',
    cardForeground: '220 20% 98%',
    popover: '220 30% 7%',
    popoverForeground: '220 20% 98%',
    primary: '183 100% 50%',
    primaryForeground: '220 30% 5%',
    secondary: '301 100% 50%',
    secondaryForeground: '220 20% 98%',
    muted: '220 30% 15%',
    mutedForeground: '220 20% 60%',
    accent: '301 100% 50%',
    accentForeground: '220 30% 5%',
    destructive: '0 100% 50%',
    destructiveForeground: '220 20% 98%',
    border: '220 30% 18%',
    input: '220 30% 18%',
    ring: '183 100% 50%',
    radius: '0.5rem',
  },
} as const;
