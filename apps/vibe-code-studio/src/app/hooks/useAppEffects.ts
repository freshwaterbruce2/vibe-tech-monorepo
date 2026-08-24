/**
 * useAppEffects — re-exports app side-effect hooks and a combined entry.
 *
 * Implementations live in sibling modules to stay under soft line limits.
 */

import { useAIProviderInit } from './useAIProviderInit';
import { useApiKeyLoader } from './useApiKeyLoader';
import { useAppInit } from './useAppInit';
import { useDatabaseInit } from './useDatabaseInit';
import type { UseAppEffectsProps } from './useAppEffects.types';

export type { UseAppEffectsProps } from './useAppEffects.types';
export { isBackendHealthReady, pollBackendHealth, waitForBackendReady } from './backendHealth';
export { useAIProviderInit } from './useAIProviderInit';
export { useApiKeyLoader } from './useApiKeyLoader';
export { useAppInit } from './useAppInit';
export { useDatabaseInit } from './useDatabaseInit';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

/**
 * Combined hook for all app effects
 */
export function useAppEffects(props: UseAppEffectsProps) {
  const {
    showWarning,
    showError,
    setDbStatus,
    setOpenrouterApiKey,
    handleOpenFolder,
    handleOpenFile,
  } = props;

  useAIProviderInit();
  useDatabaseInit({ setDbStatus, showWarning, showError });
  useAppInit({ showWarning, handleOpenFolder, handleOpenFile });
  useApiKeyLoader({ setOpenrouterApiKey });
}
