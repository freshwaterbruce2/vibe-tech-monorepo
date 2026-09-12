import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/dataStore', () => ({ dataStore: {} }));
const { persistSensoryPreferences, requireValidSensoryPreferences, applySensoryPreferences, applyPreferences } = vi.hoisted(() => ({
  persistSensoryPreferences: vi.fn(),
  requireValidSensoryPreferences: vi.fn((value: unknown) => {
    if (!value || typeof value !== 'object' || !('soundEnabled' in value)) {
      throw new Error('invalid sensory preferences');
    }
    return value;
  }),
  applySensoryPreferences: vi.fn(),
  applyPreferences: vi.fn(),
}));
vi.mock('../../../services/sensoryPreferences', () => ({
  DEFAULT_SENSORY_PREFERENCES: {
    animationSpeed: 'normal', soundEnabled: true, hapticEnabled: true,
    fontSize: 'medium', dyslexiaFont: false, colorMode: 'default',
  },
  persistSensoryPreferences,
  requireValidSensoryPreferences,
  applySensoryPreferences,
}));
vi.mock('../../../services/soundEffects', () => ({ soundEffects: { applyPreferences } }));

import DataManagement from '../DataManagement';

describe('DataManagement — privacy policy (Play 13+)', () => {
  it('exposes an expandable privacy policy reachable from settings', () => {
    render(<DataManagement />);

    // Collapsed by default.
    expect(screen.queryByRole('region', { name: /privacy policy/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /privacy policy/i }));

    const policy = screen.getByRole('region', { name: /privacy policy/i });
    expect(policy).toBeInTheDocument();
    // The canonical teen scope and data-handling statements are present.
    expect(screen.getByText(/ages 13–17/i)).toBeInTheDocument();
    expect(screen.getByText(/do not sell personal data/i)).toBeInTheDocument();
  });
});

describe('DataManagement sensory imports', () => {
  it('rejects an invalid sensory import before reporting success or reloading', async () => {
    const alert = vi.fn();
    vi.stubGlobal('alert', alert);
    vi.stubGlobal('confirm', vi.fn(() => true));

    class InvalidSensoryFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsText() {
        this.onload?.({ target: { result: '{"sensory-prefs":{"animationSpeed":"none"}}' } } as unknown as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal('FileReader', InvalidSensoryFileReader);

    const { container } = render(<DataManagement />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(['invalid'], 'backup.json', { type: 'application/json' })] },
    });

    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringMatching(/failed to import/i)));
    expect(persistSensoryPreferences).not.toHaveBeenCalled();
  });
});
