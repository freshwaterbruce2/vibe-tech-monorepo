import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { defaults, loadSensoryPreferences, persistSensoryPreferences, applySensoryPreferences, applyPreferences, initializeSensoryPreferences } = vi.hoisted(() => ({
  defaults: {
    animationSpeed: 'normal' as const,
    soundEnabled: true,
    hapticEnabled: true,
    fontSize: 'medium' as const,
    dyslexiaFont: false,
    colorMode: 'default' as const,
  },
  loadSensoryPreferences: vi.fn(),
  persistSensoryPreferences: vi.fn(),
  applySensoryPreferences: vi.fn(),
  applyPreferences: vi.fn(),
  initializeSensoryPreferences: vi.fn((prefs: unknown) => prefs),
}));

vi.mock('../../../services/sensoryPreferences', () => ({
  DEFAULT_SENSORY_PREFERENCES: defaults,
  loadSensoryPreferences,
  persistSensoryPreferences,
  applySensoryPreferences,
  initializeSensoryPreferences,
}));
vi.mock('../../../services/soundEffects', () => ({
  soundEffects: { applyPreferences },
}));

import SensorySettings from '../SensorySettings';

describe('SensorySettings persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSensoryPreferences.mockResolvedValue(defaults);
    initializeSensoryPreferences.mockImplementation((prefs: unknown) => {
      applySensoryPreferences(prefs);
      return prefs;
    });
    persistSensoryPreferences.mockImplementation(async (prefs: unknown) => ({ status: 'confirmed', prefs }));
  });

  it('loads defaults on first startup and immediately applies a sound change', async () => {
    render(<SensorySettings />);
    await waitFor(() => expect(applySensoryPreferences).toHaveBeenCalledWith(defaults));

    fireEvent.click(screen.getByRole('switch', { name: /sound effects/i }));
    await waitFor(() =>
      expect(persistSensoryPreferences).toHaveBeenCalledWith({ ...defaults, soundEnabled: false }),
    );
    expect(applyPreferences).toHaveBeenLastCalledWith({ ...defaults, soundEnabled: false });
  });

  it('resets saved preferences and surfaces a write-readback failure honestly', async () => {
    loadSensoryPreferences.mockResolvedValue({ ...defaults, fontSize: 'large' as const });
    persistSensoryPreferences.mockResolvedValue({
      status: 'failed',
      prefs: { ...defaults, fontSize: 'large' },
      error: new Error('readback mismatch'),
    });
    render(<SensorySettings />);

    await screen.findByRole('button', { name: /reset/i });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i),
    );
    expect(applySensoryPreferences).toHaveBeenLastCalledWith({ ...defaults, fontSize: 'large' });
  });
});
