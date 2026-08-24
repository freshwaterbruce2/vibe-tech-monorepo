import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../useAIProviderInit', () => ({ useAIProviderInit: vi.fn() }));
vi.mock('../useDatabaseInit', () => ({ useDatabaseInit: vi.fn() }));
vi.mock('../useAppInit', () => ({ useAppInit: vi.fn() }));
vi.mock('../useApiKeyLoader', () => ({ useApiKeyLoader: vi.fn() }));

import { useAIProviderInit } from '../useAIProviderInit';
import { useApiKeyLoader } from '../useApiKeyLoader';
import { useAppEffects } from '../useAppEffects';
import { useAppInit } from '../useAppInit';
import { useDatabaseInit } from '../useDatabaseInit';

describe('useAppEffects composite', () => {
  it('wires the four boot effects', () => {
    const props = {
      showWarning: vi.fn(),
      showError: vi.fn(),
      setDbStatus: vi.fn(),
      setOpenrouterApiKey: vi.fn(),
      handleOpenFolder: vi.fn(),
      handleOpenFile: vi.fn(),
    };

    renderHook(() => useAppEffects(props));

    expect(useAIProviderInit).toHaveBeenCalled();
    expect(useDatabaseInit).toHaveBeenCalledWith({
      setDbStatus: props.setDbStatus,
      showWarning: props.showWarning,
      showError: props.showError,
    });
    expect(useAppInit).toHaveBeenCalledWith({
      showWarning: props.showWarning,
      handleOpenFolder: props.handleOpenFolder,
      handleOpenFile: props.handleOpenFile,
    });
    expect(useApiKeyLoader).toHaveBeenCalledWith({
      setOpenrouterApiKey: props.setOpenrouterApiKey,
    });
  });
});
