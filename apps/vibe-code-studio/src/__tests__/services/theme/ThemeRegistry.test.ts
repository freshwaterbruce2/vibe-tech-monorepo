import { describe, it, expect } from 'vitest';

import {
  DEFAULT_PRESET,
  DEFAULT_PRESET_ID,
  getDefaultPreset,
  getPreset,
  isPresetId,
  TEXTMATE_LANGS,
  THEME_PRESETS,
} from '../../../services/theme/ThemeRegistry';

describe('ThemeRegistry', () => {
  it('ships at least 8 curated presets (spec 01 AC #1)', () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(8);
  });

  it('includes both dark and light presets', () => {
    expect(THEME_PRESETS.some(p => p.type === 'dark')).toBe(true);
    expect(THEME_PRESETS.some(p => p.type === 'light')).toBe(true);
  });

  it('exposes the parity language set including TS and Rust', () => {
    expect(TEXTMATE_LANGS).toContain('typescript');
    expect(TEXTMATE_LANGS).toContain('rust');
    expect(TEXTMATE_LANGS).toContain('python');
  });

  it('resolves a known preset by id', () => {
    const preset = getPreset('dracula');
    expect(preset).toBeDefined();
    expect(preset?.shikiName).toBe('dracula');
  });

  it('returns undefined for an unknown id', () => {
    expect(getPreset('nope')).toBeUndefined();
  });

  it('reports preset membership via isPresetId', () => {
    expect(isPresetId('github-dark')).toBe(true);
    expect(isPresetId('vibe-dark')).toBe(false);
  });

  it('exposes a concrete default preset', () => {
    expect(getDefaultPreset()).toBe(DEFAULT_PRESET);
    expect(DEFAULT_PRESET_ID).toBe(DEFAULT_PRESET.id);
    expect(getPreset(DEFAULT_PRESET_ID)).toBe(DEFAULT_PRESET);
  });
});
