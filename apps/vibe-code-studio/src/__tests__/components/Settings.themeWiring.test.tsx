import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Settings } from '../../components/Settings';
import type { EditorSettings } from '../../types';

const baseSettings: EditorSettings = {
  theme: 'one-dark-pro',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  aiAutoComplete: true,
  aiSuggestions: true,
};

describe('Settings — theme wiring', () => {
  it('routes a preset card selection into onSettingsChange on save', async () => {
    const onSettingsChange = vi.fn();
    render(
      <Settings
        isOpen
        onClose={vi.fn()}
        settings={baseSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    await userEvent.click(screen.getByLabelText('Dracula theme'));
    await userEvent.click(screen.getByText('Save Changes'));

    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dracula' }));
  });

  it('routes an imported VS Code theme into custom settings on save', async () => {
    const onSettingsChange = vi.fn();
    render(
      <Settings
        isOpen
        onClose={vi.fn()}
        settings={baseSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const themeJson = JSON.stringify({
      name: 'Dropped Theme',
      type: 'dark',
      colors: { 'editor.background': '#0b0b0b' },
      tokenColors: [{ scope: 'comment', settings: { foreground: '#777777' } }],
    });
    fireEvent.change(screen.getByLabelText('Theme file'), {
      target: {
        files: [new File([themeJson], 'dropped-theme.json', { type: 'application/json' })],
      },
    });

    await waitFor(() =>
      expect(screen.getByLabelText('Custom JSON theme')).toHaveAttribute('aria-selected', 'true')
    );
    await userEvent.click(screen.getByText('Save Changes'));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'custom',
        customThemeJson: expect.stringContaining('"name": "Dropped Theme"'),
      })
    );
  });
});
