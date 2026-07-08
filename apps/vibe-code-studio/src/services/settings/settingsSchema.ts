/**
 * settingsSchema — zod schema for spec 06 settings export/import, bound to
 * the EditorSettings type via `satisfies` so schema/type drift fails
 * typecheck. API keys are stored by SecureApiKeyManager, NOT in
 * EditorSettings, so exports are sensitive-free by construction (AC #6).
 * Spec: FEATURE_SPECS/competitive-gaps/06-SETTINGS-SYNC-PROFILES.md
 */
import { z } from 'zod';
import type { EditorSettings } from '../../types';

export const SETTINGS_EXPORT_VERSION = 1;

export const editorSettingsSchema = z.object({
  theme: z.string(),
  customThemeJson: z.string().optional(),
  fontSize: z.number(),
  fontFamily: z.string().optional(),
  tabSize: z.number(),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  autoSave: z.boolean(),
  aiAutoComplete: z.boolean(),
  aiSuggestions: z.boolean(),
  aiModel: z.string().optional(),
  showReasoningProcess: z.boolean().optional(),
  lineNumbers: z.boolean().optional(),
  folding: z.boolean().optional(),
  bracketMatching: z.boolean().optional(),
  autoIndent: z.boolean().optional(),
  formatOnSave: z.boolean().optional(),
  rulers: z.array(z.number()).optional(),
  renderWhitespace: z.boolean().optional(),
  smoothScrolling: z.boolean().optional(),
  cursorBlinking: z.boolean().optional(),
}) satisfies z.ZodType<EditorSettings>;

/** Importers accept partial payloads — the diff preview treats missing keys as unchanged. */
export const settingsExportFileSchema = z.object({
  version: z.literal(SETTINGS_EXPORT_VERSION),
  exportedAt: z.string(),
  settings: editorSettingsSchema.partial(),
});

export type SettingsExportFile = z.infer<typeof settingsExportFileSchema>;
