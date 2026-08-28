import { describe, expect, it } from 'vitest';

import type { ThemeImportErrorCode } from '../../../services/theme/ThemeImporter';

import {
  importVSCodeTheme,
  importVSCodeThemeFile,
  parseVSCodeTheme,
  ThemeImportError,
} from '../../../services/theme/ThemeImporter';

const VALID_THEME = {
  name: 'My Theme',
  type: 'dark',
  colors: {
    'editor.background': '#1e1e2e',
    'editor.foreground': '#cdd6f4',
    'terminal.ansiRed': '#f38ba8',
  },
  tokenColors: [
    {
      name: 'Comments',
      scope: 'comment, punctuation.definition.comment',
      settings: { foreground: '#6c7086', fontStyle: 'italic' },
    },
    {
      scope: ['keyword.control', 'storage.type'],
      settings: { foreground: '#cba6f7' },
    },
  ],
};

function expectImportError(fn: () => unknown, code: ThemeImportErrorCode): void {
  try {
    fn();
    expect.unreachable('expected ThemeImportError');
  } catch (error) {
    expect(error).toBeInstanceOf(ThemeImportError);
    expect((error as ThemeImportError).code).toBe(code);
    expect((error as ThemeImportError).name).toBe('ThemeImportError');
  }
}

describe('parseVSCodeTheme', () => {
  it('parses a valid dark theme with string + array scopes', () => {
    const theme = parseVSCodeTheme(JSON.stringify(VALID_THEME));
    expect(theme.name).toBe('My Theme');
    expect(theme.type).toBe('dark');
    expect(theme.colors['editor.background']).toBe('#1e1e2e');
    expect(theme.tokenColors).toHaveLength(2);
    expect(theme.tokenColors[0].scope).toEqual(['comment', 'punctuation.definition.comment']);
    expect(theme.tokenColors[0].name).toBe('Comments');
    expect(theme.tokenColors[0].settings).toEqual({
      foreground: '#6c7086',
      fontStyle: 'italic',
    });
    expect(theme.tokenColors[1].scope).toEqual(['keyword.control', 'storage.type']);
    expect(theme.tokenColors[1].settings).toEqual({ foreground: '#cba6f7' });
    expect(theme.tokenColors[1].name).toBeUndefined();
  });

  it('parses a light theme', () => {
    const theme = parseVSCodeTheme(JSON.stringify({ ...VALID_THEME, type: 'light' }));
    expect(theme.type).toBe('light');
  });

  it('maps high-contrast types onto dark/light', () => {
    expect(parseVSCodeTheme(JSON.stringify({ type: 'hc-black' })).type).toBe('dark');
    expect(parseVSCodeTheme(JSON.stringify({ type: 'hc' })).type).toBe('dark');
    expect(parseVSCodeTheme(JSON.stringify({ type: 'hcDark' })).type).toBe('dark');
    expect(parseVSCodeTheme(JSON.stringify({ type: 'hc-light' })).type).toBe('light');
    expect(parseVSCodeTheme(JSON.stringify({ type: 'hcLight' })).type).toBe('light');
  });

  it('defaults missing name/type/colors/tokenColors', () => {
    const theme = parseVSCodeTheme('{}');
    expect(theme).toEqual({
      name: 'Imported Theme',
      type: 'dark',
      colors: {},
      tokenColors: [],
    });
  });

  it('uses the provided fallback name when name is missing or empty', () => {
    expect(parseVSCodeTheme('{}', 'Dropped File').name).toBe('Dropped File');
    expect(parseVSCodeTheme(JSON.stringify({ name: '' }), 'Dropped File').name).toBe(
      'Dropped File'
    );
  });

  it('drops non-string color values but keeps string ones', () => {
    const theme = parseVSCodeTheme(
      JSON.stringify({ colors: { good: '#fff', bad: 42, worse: null } })
    );
    expect(theme.colors).toEqual({ good: '#fff' });
  });

  it('normalizes scope whitespace and drops empty/non-string scope parts', () => {
    const theme = parseVSCodeTheme(
      JSON.stringify({
        tokenColors: [
          { scope: '  comment ,, string  ', settings: {} },
          { scope: ['keyword', 42, ' entity.name ', ''], settings: {} },
          { settings: { foreground: '#fff' } },
        ],
      })
    );
    expect(theme.tokenColors[0].scope).toEqual(['comment', 'string']);
    expect(theme.tokenColors[1].scope).toEqual(['keyword', 'entity.name']);
    expect(theme.tokenColors[2].scope).toEqual([]);
  });

  it('drops non-string settings fields', () => {
    const theme = parseVSCodeTheme(
      JSON.stringify({
        tokenColors: [{ scope: 'comment', settings: { foreground: 1, fontStyle: 'bold' } }],
      })
    );
    expect(theme.tokenColors[0].settings).toEqual({ fontStyle: 'bold' });
  });

  it('rejects malformed JSON with a typed error', () => {
    expectImportError(() => parseVSCodeTheme('{ not json'), 'invalid-json');
  });

  it('rejects non-object roots', () => {
    expectImportError(() => parseVSCodeTheme('null'), 'not-an-object');
    expectImportError(() => parseVSCodeTheme('[]'), 'not-an-object');
    expectImportError(() => parseVSCodeTheme('"dark"'), 'not-an-object');
  });

  it('rejects unknown theme types', () => {
    expectImportError(() => parseVSCodeTheme(JSON.stringify({ type: 'neon' })), 'invalid-type');
    expectImportError(() => parseVSCodeTheme(JSON.stringify({ type: 3 })), 'invalid-type');
  });

  it('rejects non-object colors', () => {
    expectImportError(() => parseVSCodeTheme(JSON.stringify({ colors: [] })), 'invalid-colors');
  });

  it('rejects malformed tokenColors', () => {
    expectImportError(
      () => parseVSCodeTheme(JSON.stringify({ tokenColors: {} })),
      'invalid-token-colors'
    );
    expectImportError(
      () => parseVSCodeTheme(JSON.stringify({ tokenColors: ['nope'] })),
      'invalid-token-colors'
    );
    expectImportError(
      () => parseVSCodeTheme(JSON.stringify({ tokenColors: [{ scope: 'comment' }] })),
      'invalid-token-colors'
    );
    expectImportError(
      () =>
        parseVSCodeTheme(JSON.stringify({ tokenColors: [{ scope: 'comment', settings: 'x' }] })),
      'invalid-token-colors'
    );
    expectImportError(
      () => parseVSCodeTheme(JSON.stringify({ tokenColors: [{ scope: 7, settings: {} }] })),
      'invalid-token-colors'
    );
  });
});

describe('importVSCodeTheme', () => {
  it('returns canonical JSON that round-trips through the loadCustomTheme shape', () => {
    const result = importVSCodeTheme(JSON.stringify(VALID_THEME));
    expect(result.name).toBe('My Theme');
    expect(result.type).toBe('dark');
    const roundTrip = JSON.parse(result.customThemeJson);
    expect(roundTrip.name).toBe('My Theme');
    expect(roundTrip.type).toBe('dark');
    expect(roundTrip.colors['terminal.ansiRed']).toBe('#f38ba8');
    expect(Array.isArray(roundTrip.tokenColors[0].scope)).toBe(true);
  });

  it('propagates typed parse errors', () => {
    expectImportError(() => importVSCodeTheme('nope'), 'invalid-json');
  });
});

describe('importVSCodeThemeFile', () => {
  it('imports a picked file and derives the name from the file name', async () => {
    const file = new File([JSON.stringify({ type: 'light' })], 'Rose Pine.JSON', {
      type: 'application/json',
    });
    const result = await importVSCodeThemeFile(file);
    expect(result.name).toBe('Rose Pine');
    expect(result.type).toBe('light');
  });

  it('falls back to the default name for unusable file names', async () => {
    const file = new File(['{}'], '.json', { type: 'application/json' });
    const result = await importVSCodeThemeFile(file);
    expect(result.name).toBe('Imported Theme');
  });

  it('prefers the theme JSON name over the file name', async () => {
    const file = new File([JSON.stringify({ name: 'Inner Name' })], 'outer.json', {
      type: 'application/json',
    });
    const result = await importVSCodeThemeFile(file);
    expect(result.name).toBe('Inner Name');
  });

  it('rejects with a typed error for malformed file contents', async () => {
    const file = new File(['{ oops'], 'broken.json', { type: 'application/json' });
    await expect(importVSCodeThemeFile(file)).rejects.toMatchObject({
      name: 'ThemeImportError',
      code: 'invalid-json',
    });
  });
});
