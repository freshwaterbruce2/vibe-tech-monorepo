import { useCallback, useEffect, useState } from 'react';
import { getTokenBalance, initializeTokenLedger, earnTokens as earn, spendTokens as spend, subscribeToTokenChanges, type TokenMutationResult } from '../services/tokenService';

/** React facade over the canonical ledger; it never owns or mirrors persistence. */
export const useTokenEconomy = () => {
  const [userTokens, setUserTokens] = useState(getTokenBalance);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const refresh = useCallback(() => setUserTokens(getTokenBalance()), []);
  useEffect(() => {
    let active = true;
    void initializeTokenLedger().then(() => { if (active) { refresh(); setIsInitialized(true); } }).catch((error: unknown) => { if (active) setInitializationError(error instanceof Error ? error : new Error('Token storage could not be opened')); });
    return () => { active = false; };
  }, [refresh]);
  useEffect(() => subscribeToTokenChanges(refresh), [refresh]);
  const earnTokens = useCallback(async (amount: number, reason: string, operationId: string): Promise<TokenMutationResult> => earn(amount, reason, operationId), []);
  const spendTokens = useCallback(async (amount: number, reason: string, operationId: string): Promise<TokenMutationResult> => spend(amount, reason, operationId), []);
  return { userTokens, isInitialized, initializationError, earnTokens, spendTokens, hasTokens: (amount: number) => userTokens >= amount };
};
