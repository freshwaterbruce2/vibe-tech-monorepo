import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const loadTheme = vi.fn().mockResolvedValue(undefined);
  const highlighter = { loadTheme };
  const createHighlighter = vi.fn().mockResolvedValue(highlighter);
  const shikiToMonaco = vi.fn();
  return { loadTheme, highlighter, createHighlighter, shikiToMonaco };
});

vi.mock('shiki', () => ({ createHighlighter: mocks.createHighlighter }));
vi.mock('@shikijs/monaco', () => ({ shikiToMonaco: mocks.shikiToMonaco }));
vi.mock('monaco-editor', () => ({ editor: {} }));

import {
  __resetTextMateEngineForTests,
  configureTextMateTheming,
} from '../../../services/theme/textMateEngine';

describe('textMateEngine', () => {
  beforeEach(() => {
    __resetTextMateEngineForTests();
    mocks.createHighlighter.mockClear();
    mocks.loadTheme.mockClear();
    mocks.shikiToMonaco.mockClear();
  });

  it('creates the highlighter once with the default theme + parity langs', async () => {
    const name = await configureTextMateTheming('one-dark-pro');

    expect(name).toBe('one-dark-pro');
    expect(mocks.createHighlighter).toHaveBeenCalledTimes(1);
    const arg = mocks.createHighlighter.mock.calls[0][0];
    expect(arg.themes).toEqual(['one-dark-pro']);
    expect(arg.langs).toContain('typescript');
    // Default theme is pre-loaded by createHighlighter — not re-loaded.
    expect(mocks.loadTheme).not.toHaveBeenCalled();
    expect(mocks.shikiToMonaco).toHaveBeenCalledTimes(1);
  });

  it('loads a non-default theme on demand and reuses the highlighter', async () => {
    await configureTextMateTheming('one-dark-pro');
    const name = await configureTextMateTheming('dracula');

    expect(name).toBe('dracula');
    expect(mocks.createHighlighter).toHaveBeenCalledTimes(1); // reused
    expect(mocks.loadTheme).toHaveBeenCalledWith('dracula');
  });

  it('does not reload an already-loaded theme', async () => {
    await configureTextMateTheming('dracula');
    mocks.loadTheme.mockClear();
    await configureTextMateTheming('dracula');

    expect(mocks.loadTheme).not.toHaveBeenCalled();
  });

  it('recreates the highlighter after a reset', async () => {
    await configureTextMateTheming('one-dark-pro');
    __resetTextMateEngineForTests();
    await configureTextMateTheming('one-dark-pro');

    expect(mocks.createHighlighter).toHaveBeenCalledTimes(2);
  });
});
