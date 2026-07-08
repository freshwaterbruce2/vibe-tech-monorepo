/**
 * SettingsSerializer — spec 06 Phase 1: versioned JSON export of
 * EditorSettings, validated import with a preview diff before anything is
 * applied. Pure module; persistence stays in useEditorStore.
 * Spec: FEATURE_SPECS/competitive-gaps/06-SETTINGS-SYNC-PROFILES.md
 */
import type { EditorSettings } from '../../types';
import {
  SETTINGS_EXPORT_VERSION,
  type SettingsExportFile,
  settingsExportFileSchema,
} from './settingsSchema';

export interface SettingsDiffEntry {
  key: keyof EditorSettings;
  current: unknown;
  incoming: unknown;
}

export type SettingsImportResult =
  | { ok: true; file: SettingsExportFile }
  | { ok: false; error: string };

/** Serialize current settings into the versioned export document. */
export function exportSettings(
  settings: EditorSettings,
  now: () => Date = () => new Date()
): string {
  const file: SettingsExportFile = {
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: now().toISOString(),
    settings,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Parse + validate an import payload. Never throws. */
export function parseSettingsImport(json: string): SettingsImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }
  const version = (raw as { version?: unknown } | null)?.version;
  if (version !== SETTINGS_EXPORT_VERSION) {
    return {
      ok: false,
      error: `Unsupported settings version: ${String(version)} (expected ${SETTINGS_EXPORT_VERSION}).`,
    };
  }
  const parsed = settingsExportFileSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join('.') || 'payload';
    return { ok: false, error: `Invalid settings file: ${path} — ${first?.message ?? 'unknown'}` };
  }
  return { ok: true, file: parsed.data };
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Keys whose incoming value differs from the current settings. */
export function computeSettingsDiff(
  current: EditorSettings,
  incoming: Partial<EditorSettings>
): SettingsDiffEntry[] {
  const entries: SettingsDiffEntry[] = [];
  for (const key of Object.keys(incoming) as Array<keyof EditorSettings>) {
    const incomingValue = incoming[key];
    if (incomingValue === undefined) {
      continue;
    }
    if (!sameValue(current[key], incomingValue)) {
      entries.push({ key, current: current[key], incoming: incomingValue });
    }
  }
  return entries;
}

/** Patch object for useEditorStore.updateSettings from an approved diff. */
export function buildSettingsPatch(entries: SettingsDiffEntry[]): Partial<EditorSettings> {
  const patch: Record<string, unknown> = {};
  for (const entry of entries) {
    patch[entry.key] = entry.incoming;
  }
  return patch as Partial<EditorSettings>;
}
