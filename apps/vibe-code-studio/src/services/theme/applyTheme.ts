/**
 * Theme application orchestrator — the single entry point the editor calls to
 * apply a persisted `settings.theme` value. Resolves the value (pure logic),
 * then drives the correct backend: Monaco built-in (legacy), custom-JSON import,
 * or the Shiki TextMate engine (presets). Always falls back to a Monaco built-in
 * theme rather than leaving the editor uncolored (AC #8).
 */

import { logger } from '../Logger';
import { loadCustomTheme } from '../../utils/themeLoader';
import { configureTextMateTheming } from './textMateEngine';
import { CUSTOM_MONACO_THEME, LEGACY_DARK, LEGACY_LIGHT, resolveTheme } from './themeResolver';

/**
 * Apply the editor theme identified by `themeId`. `customThemeJson` is only used
 * for the legacy `'custom'` value. Safe to call repeatedly; never throws — parse
 * or engine failures degrade to a Monaco built-in theme.
 */
export async function applyEditorTheme(
  themeId: string | undefined,
  customThemeJson?: string
): Promise<void> {
  const resolution = resolveTheme(themeId, Boolean(customThemeJson));
  const monaco = await import('monaco-editor');

  if (resolution.kind === 'legacy') {
    monaco.editor.setTheme(resolution.monacoTheme);
    return;
  }

  if (resolution.kind === 'custom') {
    const ok = await loadCustomTheme(CUSTOM_MONACO_THEME, customThemeJson ?? '');
    monaco.editor.setTheme(ok ? CUSTOM_MONACO_THEME : LEGACY_DARK);
    return;
  }

  try {
    const themeName = await configureTextMateTheming(resolution.preset.shikiName);
    monaco.editor.setTheme(themeName);
  } catch (error) {
    logger.error(`[Theme] Shiki theme "${resolution.preset.id}" failed to apply`, error);
    monaco.editor.setTheme(resolution.preset.type === 'light' ? LEGACY_LIGHT : LEGACY_DARK);
  }
}
