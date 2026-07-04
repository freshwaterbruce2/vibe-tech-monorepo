import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
