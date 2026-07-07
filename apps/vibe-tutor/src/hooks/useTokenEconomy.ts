import { useCallback, useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { dataStore } from '../services/dataStore';
import {
  earnTokens as earnTokensInLedger,
  getTokenBalance,
  setTokenBalance,
  spendTokens as spendTokensInLedger,
  subscribeToTokenChanges,
  syncTokenBalanceFromLegacy,
} from '../services/tokenService';

// Guard so the one-time legacy-balance import runs at most once per app lifetime,
// even when useTokenEconomy is mounted by several components at once (App +
// TokenWallet). Set synchronously before the async read, this prevents a
// stale-snapshot race that could re-credit already-spent tokens.
let legacyImportAttempted = false;

/** Test-only: reset the legacy-import once-guard between isolated test cases. */
export function __resetLegacyImportForTests(): void {
  legacyImportAttempted = false;
}

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
        // Import the legacy balance at most once per app lifetime. Setting the
        // flag synchronously (before the await) makes a second concurrently-
        // mounting instance skip the import, closing the stale-snapshot race
        // that could re-credit spent tokens.
        if (!legacyImportAttempted) {
          legacyImportAttempted = true;
          try {
            const storedValue = await dataStore.getUserSettings('userTokens');
            const parsed = Number.parseInt(String(storedValue ?? ''), 10);

            if (!Number.isNaN(parsed) && parsed > 0) {
              syncTokenBalanceFromLegacy(parsed, 'dataStore userTokens');
            }
          } catch (importError) {
            // Transient failure (e.g. a storage read error): release the guard so
            // a later mount can retry the import instead of it being blocked for
            // the rest of the process. Re-throw for the outer catch to log.
            legacyImportAttempted = false;
            throw importError;
          }
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

  // Stay in sync with the canonical ledger no matter which component triggers
  // the earn/spend (so the wallet and shops never show divergent balances).
  useEffect(() => subscribeToTokenChanges(refreshBalance), [refreshBalance]);

  // Persist canonical balance to dataStore key used by legacy paths.
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    dataStore
      .saveUserSettings('userTokens', String(userTokens))
      .catch((err) => logger.error('Failed to persist token balance:', err));
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
