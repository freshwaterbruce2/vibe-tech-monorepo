/**
 * ApiKeySettings Component Tests
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApiKeySettings from '../../components/ApiKeySettings';

const getStoredProviders = vi.fn();
const validateApiKey = vi.fn();
const storeApiKey = vi.fn();
const testApiKey = vi.fn();
const removeApiKey = vi.fn();
const supportsPersistentStorage = vi.fn();

vi.mock('../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@vibetech/core', () => ({
  SecureApiKeyManager: {
    getInstance: () => ({
      getStoredProviders,
      validateApiKey,
      storeApiKey,
      testApiKey,
      removeApiKey,
      supportsPersistentStorage,
    }),
  },
}));

describe('ApiKeySettings', () => {
  beforeEach(() => {
    getStoredProviders.mockReset().mockResolvedValue([]);
    validateApiKey.mockReset().mockReturnValue(true);
    storeApiKey.mockReset().mockResolvedValue(true);
    testApiKey.mockReset().mockResolvedValue(true);
    removeApiKey.mockReset().mockResolvedValue(true);
    supportsPersistentStorage.mockReset().mockReturnValue(true);
  });

  it('loads API key statuses exactly once on mount', async () => {
    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(getStoredProviders).toHaveBeenCalledTimes(1);
    });

    expect(screen.getAllByText('Not configured').length).toBeGreaterThan(0);
  });

  it('reflects a stored valid provider status after loading', async () => {
    getStoredProviders.mockResolvedValue([
      {
        provider: 'openrouter',
        metadata: {
          isValid: true,
          lastValidated: new Date(),
          encrypted: true,
          provider: 'openrouter',
        },
      },
    ]);

    render(<ApiKeySettings />);

    await waitFor(() => {
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });
  });

  it('saves a key, reloads statuses, and notifies listeners', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(<ApiKeySettings />);

    await waitFor(() => expect(getStoredProviders).toHaveBeenCalledTimes(1));

    const [firstInput] = screen.getAllByLabelText('API Key');
    fireEvent.change(firstInput, { target: { value: 'sk-or-test-key-1234567890123456' } });

    const [firstSaveButton] = screen.getAllByText('Save Key');
    fireEvent.click(firstSaveButton);

    await waitFor(() => {
      expect(storeApiKey).toHaveBeenCalledWith('openrouter', 'sk-or-test-key-1234567890123456');
      expect(getStoredProviders).toHaveBeenCalledTimes(2);
    });

    const dispatchedTypes = dispatchSpy.mock.calls.map(([event]) => (event as Event).type);
    expect(dispatchedTypes).toContain('apiKeyUpdated');
  });
});
