/**
 * Theme Registry — curated VS Code / TextMate preset themes for Vibe Code Studio.
 *
 * Each preset maps a stable `id` (persisted in `EditorSettings.theme`) to the
 * Shiki bundled-theme name used by the TextMate tokenizer engine. Kept as pure
 * data + lookups so it is fully unit-testable with no Monaco/Shiki dependency.
 */

export type ThemeType = 'dark' | 'light';

export interface ThemePreset {
  /** Stable id persisted in `settings.theme`. */
  id: string;
  /** Human-readable label shown in the theme picker. */
  label: string;
  /** Shiki bundled-theme name passed to `createHighlighter`/`loadTheme`. */
  shikiName: string;
  /** Base kind — drives Monaco fallback base and picker grouping. */
  type: ThemeType;
}

/** Default preset applied when no valid theme id is persisted. */
export const DEFAULT_PRESET: ThemePreset = {
  id: 'one-dark-pro',
  label: 'One Dark Pro',
  shikiName: 'one-dark-pro',
  type: 'dark',
};

/**
 * Curated preset list (min. 8 per spec 01). Ids intentionally match their Shiki
 * bundled-theme names so a persisted id round-trips cleanly, but the two fields
 * are kept distinct in case a future custom id needs to point at a Shiki theme
 * with a different name.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  DEFAULT_PRESET,
  { id: 'dracula', label: 'Dracula', shikiName: 'dracula', type: 'dark' },
  { id: 'github-dark', label: 'GitHub Dark', shikiName: 'github-dark', type: 'dark' },
  { id: 'github-light', label: 'GitHub Light', shikiName: 'github-light', type: 'light' },
  { id: 'nord', label: 'Nord', shikiName: 'nord', type: 'dark' },
  { id: 'monokai', label: 'Monokai', shikiName: 'monokai', type: 'dark' },
  { id: 'solarized-dark', label: 'Solarized Dark', shikiName: 'solarized-dark', type: 'dark' },
  { id: 'solarized-light', label: 'Solarized Light', shikiName: 'solarized-light', type: 'light' },
];

/** Default preset id applied when no valid theme id is persisted. */
export const DEFAULT_PRESET_ID = DEFAULT_PRESET.id;

/**
 * Parity language set (spec 01 AC #5 — matches Phase 1 LSP languages in spec 07).
 * Values are Shiki bundled-language names.
 */
export const TEXTMATE_LANGS = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'python',
  'rust',
  'json',
  'markdown',
  'yaml',
  'css',
  'scss',
  'html',
] as const;

/** Look up a preset by its persisted id. */
export function getPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(preset => preset.id === id);
}

/** True when `id` refers to a registered preset. */
export function isPresetId(id: string): boolean {
  return THEME_PRESETS.some(preset => preset.id === id);
}

/** The default preset — guaranteed present. */
export function getDefaultPreset(): ThemePreset {
  return DEFAULT_PRESET;
}
