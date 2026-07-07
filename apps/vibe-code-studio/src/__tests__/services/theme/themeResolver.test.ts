import { describe, it, expect } from 'vitest';

import { DEFAULT_PRESET } from '../../../services/theme/ThemeRegistry';
import {
  CUSTOM_MONACO_THEME,
  LEGACY_DARK,
  LEGACY_LIGHT,
  monacoThemeName,
  resolveTheme,
} from '../../../services/theme/themeResolver';

describe('resolveTheme', () => {
  it('maps legacy "light" to the Monaco built-in', () => {
    expect(resolveTheme('light', false)).toEqual({
      kind: 'legacy',
      monacoTheme: LEGACY_LIGHT,
    });
  });

  it('maps legacy "dark" to the Monaco built-in', () => {
    expect(resolveTheme('dark', false)).toEqual({
      kind: 'legacy',
      monacoTheme: LEGACY_DARK,
    });
  });

  it('routes "custom" with JSON to the custom import path', () => {
    expect(resolveTheme('custom', true)).toEqual({
      kind: 'custom',
      monacoTheme: CUSTOM_MONACO_THEME,
    });
  });

  it('falls back to the default preset for "custom" without JSON', () => {
    expect(resolveTheme('custom', false)).toEqual({
      kind: 'preset',
      preset: DEFAULT_PRESET,
    });
  });

  it('resolves a registered preset id', () => {
    const result = resolveTheme('nord', false);
    expect(result.kind).toBe('preset');
    expect(result).toMatchObject({ preset: { id: 'nord' } });
  });

  it('falls back to the default preset for an unknown id', () => {
    expect(resolveTheme('mystery', false)).toEqual({
      kind: 'preset',
      preset: DEFAULT_PRESET,
    });
  });

  it('falls back to the default preset for undefined', () => {
    expect(resolveTheme(undefined, false)).toEqual({
      kind: 'preset',
      preset: DEFAULT_PRESET,
    });
  });
});

describe('monacoThemeName', () => {
  it('returns the Shiki name for a preset', () => {
    expect(monacoThemeName('dracula', false)).toBe('dracula');
  });

  it('returns the built-in name for legacy values', () => {
    expect(monacoThemeName('light', false)).toBe(LEGACY_LIGHT);
    expect(monacoThemeName('dark', false)).toBe(LEGACY_DARK);
  });

  it('returns the custom name when JSON is present', () => {
    expect(monacoThemeName('custom', true)).toBe(CUSTOM_MONACO_THEME);
  });
});
