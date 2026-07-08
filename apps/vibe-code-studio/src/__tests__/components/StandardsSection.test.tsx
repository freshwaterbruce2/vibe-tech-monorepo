/**
 * StandardsSection tests — spec 03 AC #10 settings toggles.
 *
 * Covers the self-persisting toggle section: defaults render checked,
 * persisted values hydrate on mount, a click writes through immediately
 * (no Save button), and the Settings panel renders the new Agent Standards
 * section (wiring coverage for Settings.tsx).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { Settings } from '../../components/Settings';
import { StandardsSection } from '../../components/Settings/StandardsSection';
import {
  getStandardsSettings,
  loadStandardsSettings,
  resetStandardsSettingsForTests,
  setStandardsSetting,
  STANDARDS_SETTINGS_STORAGE_KEY,
} from '../../services/ai/standards/standardsSettings';
import type { EditorSettings } from '../../types';

beforeEach(() => {
  delete (window as unknown as { electron?: unknown }).electron;
  localStorage.clear();
  resetStandardsSettingsForTests();
});

describe('StandardsSection', () => {
  it('renders all three source toggles checked by default', async () => {
    render(<StandardsSection />);

    await waitFor(() => expect(screen.getByLabelText('Read AGENTS.md files')).toBeChecked());
    expect(screen.getByLabelText('Read .deepcoderules / .cursorrules')).toBeChecked();
    expect(screen.getByLabelText('AGENTS.md commands')).toBeChecked();
  });

  it('hydrates persisted values on mount', async () => {
    await setStandardsSetting('agentsMd', false);
    resetStandardsSettingsForTests(); // force a re-load from storage

    render(<StandardsSection />);

    await waitFor(() => expect(screen.getByLabelText('Read AGENTS.md files')).not.toBeChecked());
    expect(screen.getByLabelText('Read .deepcoderules / .cursorrules')).toBeChecked();
  });

  it('writes through immediately when a toggle is clicked (no Save button)', async () => {
    render(<StandardsSection />);
    await waitFor(() => expect(screen.getByLabelText('Read AGENTS.md files')).toBeChecked());

    await userEvent.click(screen.getByLabelText('Read AGENTS.md files'));

    expect(screen.getByLabelText('Read AGENTS.md files')).not.toBeChecked();
    await waitFor(() => expect(getStandardsSettings().agentsMd).toBe(false));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STANDARDS_SETTINGS_STORAGE_KEY) ?? '{}').agentsMd
      ).toBe(false)
    );
    // Independence: the other sources stay enabled (AC #10).
    const settings = await loadStandardsSettings();
    expect(settings.projectRules).toBe(true);
    expect(settings.agentsMdCommands).toBe(true);
  });
});

describe('Settings — Agent Standards wiring', () => {
  const baseSettings: EditorSettings = {
    theme: 'dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    autoSave: true,
    aiAutoComplete: true,
    aiSuggestions: true,
  };

  it('renders the Agent Standards section with its toggles inside Settings', async () => {
    render(
      <Settings
        isOpen
        onClose={() => undefined}
        settings={baseSettings}
        onSettingsChange={() => undefined}
      />
    );

    expect(screen.getByText('Agent Standards')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Read AGENTS.md files')).toBeChecked());
    expect(screen.getByLabelText('AGENTS.md commands')).toBeInTheDocument();
  });
});
