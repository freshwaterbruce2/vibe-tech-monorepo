/**
 * Theme resolution — pure decision logic mapping a persisted `settings.theme`
 * value to how it should be applied to Monaco. No Monaco/Shiki imports, so it is
 * fully unit-testable in isolation. Back-compat is preserved for the legacy
 * `'dark' | 'light' | 'custom'` values that predate the preset registry.
 */

import { getDefaultPreset, getPreset, type ThemePreset } from './ThemeRegistry';

/** Monaco built-in theme names (used for legacy values + fallbacks). */
export const LEGACY_DARK = 'vs-dark';
export const LEGACY_LIGHT = 'vs';
/** Monaco theme name registered by the custom-JSON import path. */
export const CUSTOM_MONACO_THEME = 'custom-user-theme';

export type ThemeResolution =
  | { kind: 'legacy'; monacoTheme: string }
  | { kind: 'custom'; monacoTheme: string }
  | { kind: 'preset'; preset: ThemePreset };

/**
 * Decide how a persisted `settings.theme` value should be applied.
 *
 * - `'light'` / `'dark'`  → Monaco built-in themes (legacy back-compat)
 * - `'custom'` + JSON     → the custom-JSON import path
 * - a registered preset id → the Shiki TextMate engine
 * - anything else (unknown id, or `'custom'` without JSON) → the default preset
 */
export function resolveTheme(themeId: string | undefined, hasCustomJson: boolean): ThemeResolution {
  if (themeId === 'light') {
    return { kind: 'legacy', monacoTheme: LEGACY_LIGHT };
  }
  if (themeId === 'dark') {
    return { kind: 'legacy', monacoTheme: LEGACY_DARK };
  }
  if (themeId === 'custom' && hasCustomJson) {
    return { kind: 'custom', monacoTheme: CUSTOM_MONACO_THEME };
  }
  const preset = themeId ? getPreset(themeId) : undefined;
  if (preset) {
    return { kind: 'preset', preset };
  }
  return { kind: 'preset', preset: getDefaultPreset() };
}

/**
 * The Monaco theme name to hand `@monaco-editor/react` as its `theme` prop.
 * For presets this is the Shiki theme name (registered on demand by the engine);
 * for legacy/custom values it is the resolved Monaco built-in / custom name.
 */
export function monacoThemeName(themeId: string | undefined, hasCustomJson: boolean): string {
  const resolution = resolveTheme(themeId, hasCustomJson);
  return resolution.kind === 'preset' ? resolution.preset.shikiName : resolution.monacoTheme;
}
