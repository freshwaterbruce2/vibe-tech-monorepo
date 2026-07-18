/**
 * Load OpenRouter API key into app state on mount.
 */

import { SecureApiKeyManager } from '@vibetech/core';
import { useEffect } from 'react';

import { logger } from '../../services/Logger';

/** Hook for loading API key on mount */
export function useApiKeyLoader(props: { setOpenrouterApiKey: (key: string) => void }) {
  const { setOpenrouterApiKey } = props;

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const keyManager = SecureApiKeyManager.getInstance(logger);
        const key = await keyManager.getApiKey('openrouter');
        if (key) {
          setOpenrouterApiKey(key);
        }
      } catch (error) {
        logger.error('Failed to load OpenRouter API key:', error);
      }
    };
    loadApiKey();
  }, [setOpenrouterApiKey]);
}
