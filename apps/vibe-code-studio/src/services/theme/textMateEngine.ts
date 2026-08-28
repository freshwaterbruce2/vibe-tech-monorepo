/**
 * TextMate tokenizer engine — bridges Shiki's TextMate grammars + themes onto
 * Monaco, replacing Monaco's built-in Monarch tokenizer for higher-fidelity
 * highlighting (spec 01).
 *
 * Shiki (`shiki`) and its Monaco adapter (`@shikijs/monaco`) are dynamically
 * imported so their WASM/oniguruma payload stays behind the same lazy boundary
 * as Monaco itself and never lands in the initial bundle (AC #9).
 *
 * The highlighter is a module singleton created with the default preset theme +
 * the parity language set; additional preset themes are loaded on demand.
 */

import type { Highlighter } from 'shiki';

import { getDefaultPreset, TEXTMATE_LANGS } from './ThemeRegistry';

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedThemes = new Set<string>();

/**
 * Lazily create (once) the shared Shiki highlighter with the parity languages
 * and the default preset theme registered.
 */
async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    const defaultTheme = getDefaultPreset().shikiName;
    const { createHighlighter } = await import('shiki');
    highlighterPromise = createHighlighter({
      themes: [defaultTheme] as Parameters<typeof createHighlighter>[0]['themes'],
      langs: [...TEXTMATE_LANGS] as Parameters<typeof createHighlighter>[0]['langs'],
    });
    await highlighterPromise;
    loadedThemes.add(defaultTheme);
  }
  return highlighterPromise;
}

/**
 * Register Shiki's tokenizer + the requested preset theme on Monaco, loading the
 * theme on demand if it has not been loaded yet, and return the theme name that
 * the caller should pass to `monaco.editor.setTheme()`.
 */
export async function configureTextMateTheming(shikiThemeName: string): Promise<string> {
  const highlighter = await getHighlighter();

  if (!loadedThemes.has(shikiThemeName)) {
    await highlighter.loadTheme(shikiThemeName as Parameters<Highlighter['loadTheme']>[0]);
    loadedThemes.add(shikiThemeName);
  }

  const monaco = await import('monaco-editor');
  const { shikiToMonaco } = await import('@shikijs/monaco');
  shikiToMonaco(highlighter, monaco);

  return shikiThemeName;
}

/** Test-only: reset the module singleton so each test starts cold. */
export function __resetTextMateEngineForTests(): void {
  highlighterPromise = null;
  loadedThemes.clear();
}
