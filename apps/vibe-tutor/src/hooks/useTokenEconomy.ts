import { useCallback, useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { dataStore } from '../services/dataStore';
import {
  earnTokens as earnTokensInLedger,
  getTokenBalance,
  setTokenBalance,
  spendTokens as spendTokensInLedger,
  syncTokenBalanceFromLegacy,
} from '../services/tokenService';

/**
 * Canonical token hook backed by tokenService.
 * Keeps compatibility with legacy user settings storage.
 */
export const useTokenEconomy = () => {
  const [userTokens, setUserTokens] = useState<number>(() => getTokenBalance());
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshBalance = useCallback(() => {
    setUserTokens(getTokenBalance());
  }, []);

  // One-time legacy import from dataStore + initial sync from canonical ledger.
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const storedValue = await dataStore.getUserSettings('userTokens');
        const parsed = Number.parseInt(String(storedValue ?? ''), 10);

        if (!Number.isNaN(parsed) && parsed > 0) {
          syncTokenBalanceFromLegacy(parsed, 'dataStore userTokens');
        }

        if (mounted) {
          refreshBalance();
          setIsInitialized(true);
        }
      } catch (error) {
        logger.error('[useTokenEconomy] Failed to initialize token ledger:', error);
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [refreshBalance]);

  // Persist canonical balance to dataStore key used by legacy paths.
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    dataStore.saveUserSettings('userTokens', String(userTokens)).catch((err) => logger.error('Failed to persist token balance:', err));
  }, [isInitialized, userTokens]);

  const earnTokens = useCallback(
    (amount: number, reason = 'Earned tokens'): void => {
      if (amount <= 0) {
        logger.warn('[useTokenEconomy] Cannot earn negative or zero tokens');
        return;
      }

      earnTokensInLedger(amount, reason);
      refreshBalance();
    },
    [refreshBalance],
  );

  const spendTokens = useCallback(
    (amount: number, reason = 'Spent tokens'): boolean => {
      if (amount <= 0) {
        logger.warn('[useTokenEconomy] Cannot spend negative or zero tokens');
        return false;
      }

      const transaction = spendTokensInLedger(amount, reason);
      if (!transaction) {
        logger.warn('[useTokenEconomy] Insufficient tokens');
        return false;
      }

      refreshBalance();
      return true;
    },
    [refreshBalance],
  );

  const hasTokens = useCallback(
    (amount: number): boolean => {
      return userTokens >= amount;
    },
    [userTokens],
  );

  const setTokens = useCallback(
    (amount: number, reason = 'Manual token adjustment'): void => {
      if (amount < 0) {
        logger.warn('[useTokenEconomy] Cannot set negative tokens');
        return;
      }

      setTokenBalance(amount, reason);
      refreshBalance();
    },
    [refreshBalance],
  );

  return {
    userTokens,
    earnTokens,
    spendTokens,
    hasTokens,
    setTokens,
  };
};
