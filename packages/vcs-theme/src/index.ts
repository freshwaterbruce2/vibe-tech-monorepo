/** @vibetech/vcs-theme — Barrel Export */

export { colors, typography, spacing, borderRadius, shadows } from './tokens';
export { components } from './components';

/** Full theme object for consumers that want everything */
export { colors as vcsColors } from './tokens';
export { components as vcsComponents } from './components';

/** Type helpers */
export type VcsColors = typeof import('./tokens').colors;
export type VcsTypography = typeof import('./tokens').typography;
export type VcsSpacing = typeof import('./tokens').spacing;
export type VcsBorderRadius = typeof import('./tokens').borderRadius;
export type VcsShadows = typeof import('./tokens').shadows;
export type VcsComponents = typeof import('./components').components;
