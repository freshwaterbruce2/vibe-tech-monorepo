import type { EditorSettings } from '../types';

const MIN_EDITOR_FONT_SIZE = 8;
const MAX_EDITOR_FONT_SIZE = 40;

/**
 * Return editor settings with the Monaco font size stepped by `delta`, clamped
 * to a sane range. Pure so the TitleBar Zoom In/Out handlers stay testable.
 */
export function zoomEditorFont(settings: EditorSettings, delta: number): EditorSettings {
  const next = Math.min(
    MAX_EDITOR_FONT_SIZE,
    Math.max(MIN_EDITOR_FONT_SIZE, settings.fontSize + delta)
  );
  return { ...settings, fontSize: next };
}
