/**
 * ThemeImporter — VS Code color-theme JSON → the app's custom-theme format
 * (spec 01 Phase 2, AC #2).
 *
 * Pure validation/normalization: no Monaco, no Shiki, no DOM beyond `File`.
 * The output `customThemeJson` string feeds the EXISTING import seam —
 * `EditorSettings.customThemeJson` consumed by `themeLoader.ts#loadCustomTheme`
 * via `applyTheme.ts` — so no new apply path is introduced.
 *
 * Legacy `.tmTheme` (plist/XML) import (AC #3) is deferred; only VS Code
 * theme JSON (the `contributes.themes` payload shape) is accepted.
 */

import type { ThemeType } from './ThemeRegistry';

export type ThemeImportErrorCode =
  | 'invalid-json'
  | 'not-an-object'
  | 'invalid-type'
  | 'invalid-colors'
  | 'invalid-token-colors';

/** Typed error thrown for any malformed theme input. */
export class ThemeImportError extends Error {
  readonly code: ThemeImportErrorCode;

  constructor(code: ThemeImportErrorCode, message: string) {
    super(message);
    this.name = 'ThemeImportError';
    this.code = code;
  }
}

export interface ImportedTokenColor {
  name?: string;
  scope: string[];
  settings: { foreground?: string; background?: string; fontStyle?: string };
}

/** Normalized VS Code color theme — the shape `loadCustomTheme` understands. */
export interface ImportedTheme {
  name: string;
  type: ThemeType;
  colors: Record<string, string>;
  tokenColors: ImportedTokenColor[];
}

export interface ThemeImportResult {
  name: string;
  type: ThemeType;
  /** Canonical JSON for `EditorSettings.customThemeJson`. */
  customThemeJson: string;
}

const DEFAULT_THEME_NAME = 'Imported Theme';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ThemeImportError('invalid-json', `Theme file is not valid JSON: ${detail}`);
  }
  if (!isPlainObject(parsed)) {
    throw new ThemeImportError('not-an-object', 'Theme JSON must be an object');
  }
  return parsed;
}

const LIGHT_TYPES = new Set(['light', 'hc-light', 'hcLight']);
const DARK_TYPES = new Set(['dark', 'hc', 'hc-black', 'hcDark']);

function normalizeType(value: unknown): ThemeType {
  if (value === undefined) {
    return 'dark';
  }
  if (typeof value === 'string' && LIGHT_TYPES.has(value)) {
    return 'light';
  }
  if (typeof value === 'string' && DARK_TYPES.has(value)) {
    return 'dark';
  }
  throw new ThemeImportError('invalid-type', `Unsupported theme "type": ${String(value)}`);
}

function normalizeColors(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }
  if (!isPlainObject(value)) {
    throw new ThemeImportError('invalid-colors', 'Theme "colors" must be an object');
  }
  const colors: Record<string, string> = {};
  for (const [key, colorValue] of Object.entries(value)) {
    if (typeof colorValue === 'string') {
      colors[key] = colorValue;
    }
  }
  return colors;
}

function normalizeScope(scope: unknown, index: number): string[] {
  if (scope === undefined) {
    return [];
  }
  if (typeof scope === 'string') {
    return scope
      .split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }
  if (Array.isArray(scope)) {
    return scope
      .filter((part): part is string => typeof part === 'string')
      .map(part => part.trim())
      .filter(part => part.length > 0);
  }
  throw new ThemeImportError(
    'invalid-token-colors',
    `tokenColors[${index}].scope must be a string or an array of strings`
  );
}

function normalizeTokenColor(entry: unknown, index: number): ImportedTokenColor {
  if (!isPlainObject(entry)) {
    throw new ThemeImportError('invalid-token-colors', `tokenColors[${index}] must be an object`);
  }
  if (!isPlainObject(entry.settings)) {
    throw new ThemeImportError(
      'invalid-token-colors',
      `tokenColors[${index}].settings must be an object`
    );
  }
  const { foreground, background, fontStyle } = entry.settings;
  const tokenColor: ImportedTokenColor = {
    scope: normalizeScope(entry.scope, index),
    settings: {
      ...(typeof foreground === 'string' ? { foreground } : {}),
      ...(typeof background === 'string' ? { background } : {}),
      ...(typeof fontStyle === 'string' ? { fontStyle } : {}),
    },
  };
  if (typeof entry.name === 'string') {
    tokenColor.name = entry.name;
  }
  return tokenColor;
}

function normalizeTokenColors(value: unknown): ImportedTokenColor[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ThemeImportError('invalid-token-colors', 'Theme "tokenColors" must be an array');
  }
  return value.map((entry, index) => normalizeTokenColor(entry, index));
}

/**
 * Parse + validate a VS Code color-theme JSON string into a normalized theme.
 * Throws `ThemeImportError` on any malformed input.
 */
export function parseVSCodeTheme(raw: string, fallbackName = DEFAULT_THEME_NAME): ImportedTheme {
  const parsed = parseJsonObject(raw);
  return {
    name: typeof parsed.name === 'string' && parsed.name.length > 0 ? parsed.name : fallbackName,
    type: normalizeType(parsed.type),
    colors: normalizeColors(parsed.colors),
    tokenColors: normalizeTokenColors(parsed.tokenColors),
  };
}

/**
 * Import a VS Code theme JSON string, returning the canonical JSON to persist
 * in `EditorSettings.customThemeJson` (the `loadCustomTheme` seam).
 */
export function importVSCodeTheme(raw: string, fallbackName?: string): ThemeImportResult {
  const theme = parseVSCodeTheme(raw, fallbackName);
  return {
    name: theme.name,
    type: theme.type,
    customThemeJson: JSON.stringify(theme, null, 2),
  };
}

/** Strip a trailing `.json` extension so a file name can act as a theme name. */
function themeNameFromFileName(fileName: string): string {
  const stripped = fileName.replace(/\.json$/i, '').trim();
  return stripped.length > 0 ? stripped : DEFAULT_THEME_NAME;
}

/** Read + import a picked/dropped VS Code theme `.json` file. */
export async function importVSCodeThemeFile(file: File): Promise<ThemeImportResult> {
  const raw = await file.text();
  return importVSCodeTheme(raw, themeNameFromFileName(file.name));
}
