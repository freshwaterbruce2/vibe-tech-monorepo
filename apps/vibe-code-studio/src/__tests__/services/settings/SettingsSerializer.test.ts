/**
 * SettingsSerializer tests — spec 06 export/import: versioned export
 * round-trip, validated import (never throws), diff preview, and patch
 * building. Also belts the settingsSchema `satisfies` binding.
 */
import { describe, expect, it } from 'vitest';
import {
  buildSettingsPatch,
  computeSettingsDiff,
  exportSettings,
  parseSettingsImport,
  type SettingsDiffEntry,
} from '../../../services/settings/SettingsSerializer';
import {
  SETTINGS_EXPORT_VERSION,
  editorSettingsSchema,
} from '../../../services/settings/settingsSchema';
import type { EditorSettings } from '../../../types';

const baseSettings: EditorSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  aiAutoComplete: true,
  aiSuggestions: true,
  aiModel: 'moonshot/kimi-2.5-pro',
  showReasoningProcess: false,
  rulers: [80, 100],
};

const fixedNow = () => new Date('2026-07-05T12:00:00.000Z');

describe('exportSettings', () => {
  it('serializes a versioned document with a deterministic timestamp', () => {
    const json = exportSettings(baseSettings, fixedNow);
    const parsed = JSON.parse(json) as {
      version: number;
      exportedAt: string;
      settings: EditorSettings;
    };
    expect(parsed.version).toBe(SETTINGS_EXPORT_VERSION);
    expect(parsed.exportedAt).toBe('2026-07-05T12:00:00.000Z');
    expect(parsed.settings).toEqual(baseSettings);
  });

  it('ends with a trailing newline', () => {
    expect(exportSettings(baseSettings, fixedNow).endsWith('\n')).toBe(true);
  });

  it('uses the current time when no clock is injected', () => {
    const before = Date.now();
    const json = exportSettings(baseSettings);
    const parsed = JSON.parse(json) as { exportedAt: string };
    const stamp = new Date(parsed.exportedAt).getTime();
    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(Date.now());
  });

  it('round-trips through parseSettingsImport', () => {
    const result = parseSettingsImport(exportSettings(baseSettings, fixedNow));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.version).toBe(SETTINGS_EXPORT_VERSION);
      expect(result.file.exportedAt).toBe('2026-07-05T12:00:00.000Z');
      expect(result.file.settings).toEqual(baseSettings);
    }
  });
});

describe('parseSettingsImport', () => {
  const importError = (json: string): string => {
    const result = parseSettingsImport(json);
    expect(result.ok).toBe(false);
    return result.ok ? '' : result.error;
  };

  it('rejects invalid JSON', () => {
    expect(importError('{not json')).toBe('Not valid JSON.');
  });

  it('rejects a wrong numeric version', () => {
    const payload = JSON.stringify({ version: 0, exportedAt: 'x', settings: {} });
    expect(importError(payload)).toBe('Unsupported settings version: 0 (expected 1).');
  });

  it('rejects a string version even when it looks right', () => {
    const payload = JSON.stringify({ version: '1', exportedAt: 'x', settings: {} });
    expect(importError(payload)).toBe('Unsupported settings version: 1 (expected 1).');
  });

  it('rejects a payload with no version field', () => {
    const payload = JSON.stringify({ exportedAt: 'x', settings: {} });
    expect(importError(payload)).toBe('Unsupported settings version: undefined (expected 1).');
  });

  it('rejects a raw null document without throwing', () => {
    expect(importError('null')).toBe('Unsupported settings version: undefined (expected 1).');
  });

  it('reports the offending path for zod-invalid settings values', () => {
    const payload = JSON.stringify({
      version: 1,
      exportedAt: '2026-07-05T12:00:00.000Z',
      settings: { fontSize: 'big' },
    });
    const error = importError(payload);
    expect(error).toMatch(/^Invalid settings file: settings\.fontSize — /);
    expect(error).toMatch(/number/i);
  });

  it('reports top-level schema failures (missing exportedAt)', () => {
    const payload = JSON.stringify({ version: 1, settings: {} });
    expect(importError(payload)).toMatch(/^Invalid settings file: exportedAt — /);
  });

  it('accepts valid partial settings', () => {
    const payload = JSON.stringify({
      version: 1,
      exportedAt: '2026-07-05T12:00:00.000Z',
      settings: { fontSize: 16, theme: 'light' },
    });
    const result = parseSettingsImport(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.settings).toEqual({ fontSize: 16, theme: 'light' });
    }
  });

  it('strips unknown settings keys instead of failing', () => {
    const payload = JSON.stringify({
      version: 1,
      exportedAt: '2026-07-05T12:00:00.000Z',
      settings: { fontSize: 16, totallyUnknownKey: true },
    });
    const result = parseSettingsImport(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.settings).toEqual({ fontSize: 16 });
      expect('totallyUnknownKey' in result.file.settings).toBe(false);
    }
  });
});

describe('computeSettingsDiff', () => {
  it('returns an empty diff for identical settings', () => {
    expect(computeSettingsDiff(baseSettings, { ...baseSettings })).toEqual([]);
  });

  it('reports a changed scalar with current and incoming values', () => {
    const diff = computeSettingsDiff(baseSettings, { fontSize: 18 });
    expect(diff).toEqual([{ key: 'fontSize', current: 14, incoming: 18 }]);
  });

  it('compares arrays by value (rulers)', () => {
    expect(computeSettingsDiff(baseSettings, { rulers: [80, 100] })).toEqual([]);
    const diff = computeSettingsDiff(baseSettings, { rulers: [120] });
    expect(diff).toEqual([{ key: 'rulers', current: [80, 100], incoming: [120] }]);
  });

  it('skips keys whose incoming value is explicitly undefined', () => {
    expect(computeSettingsDiff(baseSettings, { fontSize: undefined, theme: 'light' })).toEqual([
      { key: 'theme', current: 'dark', incoming: 'light' },
    ]);
  });

  it('treats keys missing from the incoming payload as unchanged', () => {
    expect(computeSettingsDiff(baseSettings, {})).toEqual([]);
    const diff = computeSettingsDiff(baseSettings, { tabSize: 4 });
    expect(diff.map(entry => entry.key)).toEqual(['tabSize']);
  });
});

describe('buildSettingsPatch', () => {
  it('builds exactly the incoming values from a diff', () => {
    const entries: SettingsDiffEntry[] = [
      { key: 'fontSize', current: 14, incoming: 18 },
      { key: 'theme', current: 'dark', incoming: 'light' },
    ];
    expect(buildSettingsPatch(entries)).toEqual({ fontSize: 18, theme: 'light' });
  });

  it('returns an empty patch for an empty diff', () => {
    expect(buildSettingsPatch([])).toEqual({});
  });
});

describe('editorSettingsSchema', () => {
  it('parses a full valid EditorSettings object', () => {
    const result = editorSettingsSchema.safeParse(baseSettings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(baseSettings);
    }
  });

  it('rejects an EditorSettings object with a wrong-typed field', () => {
    const result = editorSettingsSchema.safeParse({ ...baseSettings, wordWrap: 'yes' });
    expect(result.success).toBe(false);
  });
});
