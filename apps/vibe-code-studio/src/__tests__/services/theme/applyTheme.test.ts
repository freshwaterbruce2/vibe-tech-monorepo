import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  loadCustomTheme: vi.fn(),
  configureTextMateTheming: vi.fn(),
}));

vi.mock('monaco-editor', () => ({ editor: { setTheme: mocks.setTheme } }));
vi.mock('../../../utils/themeLoader', () => ({ loadCustomTheme: mocks.loadCustomTheme }));
vi.mock('../../../services/theme/textMateEngine', () => ({
  configureTextMateTheming: mocks.configureTextMateTheming,
}));
vi.mock('../../../services/Logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { applyEditorTheme } from '../../../services/theme/applyTheme';

describe('applyEditorTheme', () => {
  beforeEach(() => {
    mocks.setTheme.mockClear();
    mocks.loadCustomTheme.mockReset().mockResolvedValue(true);
    mocks.configureTextMateTheming.mockReset().mockResolvedValue('one-dark-pro');
  });

  it('applies the Monaco built-in for legacy "dark"', async () => {
    await applyEditorTheme('dark');
    expect(mocks.setTheme).toHaveBeenCalledWith('vs-dark');
    expect(mocks.loadCustomTheme).not.toHaveBeenCalled();
    expect(mocks.configureTextMateTheming).not.toHaveBeenCalled();
  });

  it('applies the Monaco built-in for legacy "light"', async () => {
    await applyEditorTheme('light');
    expect(mocks.setTheme).toHaveBeenCalledWith('vs');
  });

  it('applies the custom theme when JSON parses', async () => {
    mocks.loadCustomTheme.mockResolvedValue(true);
    await applyEditorTheme('custom', '{"type":"dark"}');
    expect(mocks.loadCustomTheme).toHaveBeenCalledWith('custom-user-theme', '{"type":"dark"}');
    expect(mocks.setTheme).toHaveBeenCalledWith('custom-user-theme');
  });

  it('falls back to vs-dark when custom JSON fails to parse', async () => {
    mocks.loadCustomTheme.mockResolvedValue(false);
    await applyEditorTheme('custom', '{bad}');
    expect(mocks.setTheme).toHaveBeenCalledWith('vs-dark');
  });

  it('applies a preset via the Shiki engine', async () => {
    mocks.configureTextMateTheming.mockResolvedValue('dracula');
    await applyEditorTheme('dracula');
    expect(mocks.configureTextMateTheming).toHaveBeenCalledWith('dracula');
    expect(mocks.setTheme).toHaveBeenCalledWith('dracula');
  });

  it('falls back to vs-dark when a dark preset engine call throws', async () => {
    mocks.configureTextMateTheming.mockRejectedValue(new Error('wasm boom'));
    await applyEditorTheme('nord');
    expect(mocks.setTheme).toHaveBeenCalledWith('vs-dark');
  });

  it('falls back to vs when a light preset engine call throws', async () => {
    mocks.configureTextMateTheming.mockRejectedValue(new Error('wasm boom'));
    await applyEditorTheme('github-light');
    expect(mocks.setTheme).toHaveBeenCalledWith('vs');
  });
});
