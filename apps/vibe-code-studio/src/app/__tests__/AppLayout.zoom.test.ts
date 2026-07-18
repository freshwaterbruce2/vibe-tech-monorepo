/**
 * zoomEditorFont backs the TitleBar View ▸ Zoom In / Zoom Out handlers, which
 * were dead logger.debug stubs. It steps the Monaco font size and clamps it to
 * a sane range so zoom can never produce an unusable editor.
 */
import { describe, expect, it } from 'vitest';

import { zoomEditorFont } from '../appLayout.zoom';
import type { EditorSettings } from '../../types';

const base: EditorSettings = {
  theme: 'vibe-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  aiAutoComplete: true,
  aiSuggestions: true,
};

describe('zoomEditorFont', () => {
  it('increments the font size on zoom in', () => {
    expect(zoomEditorFont(base, 1).fontSize).toBe(15);
  });

  it('decrements the font size on zoom out', () => {
    expect(zoomEditorFont(base, -1).fontSize).toBe(13);
  });

  it('clamps to the maximum font size', () => {
    expect(zoomEditorFont({ ...base, fontSize: 40 }, 1).fontSize).toBe(40);
  });

  it('clamps to the minimum font size', () => {
    expect(zoomEditorFont({ ...base, fontSize: 8 }, -1).fontSize).toBe(8);
  });

  it('preserves all other settings', () => {
    const result = zoomEditorFont(base, 2);
    expect(result).toEqual({ ...base, fontSize: 16 });
    // returns a new object (no mutation)
    expect(result).not.toBe(base);
    expect(base.fontSize).toBe(14);
  });
});
