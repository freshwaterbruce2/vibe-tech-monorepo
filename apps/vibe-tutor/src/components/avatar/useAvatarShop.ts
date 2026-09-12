import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarItemType, AvatarState, ShopItem } from '@vibetech/avatars';
import { dataStore } from '../../services/dataStore';
import { DEFAULT_UNLOCKED_AVATAR_IDS, SHOP_ITEMS, normalizeAvatarId } from '../../services/avatarShopData';
import { logger } from '../../utils/logger';

function createBaseAvatarState(saved?: AvatarState | null): AvatarState {
  const selectedAvatarId = normalizeAvatarId(saved?.selectedAvatarId);
  return { equippedItems: saved?.equippedItems ?? {}, ownedItems: saved?.ownedItems ?? [], ...(saved?.purchaseHistory ? { purchaseHistory: saved.purchaseHistory } : {}), ...(saved?.pendingPurchase ? { pendingPurchase: saved.pendingPurchase } : {}), selectedAvatarId, unlockedAvatars: [...new Set([...DEFAULT_UNLOCKED_AVATAR_IDS, ...(saved?.unlockedAvatars ?? []), selectedAvatarId])] };
}
type EquippedSlot = keyof AvatarState['equippedItems'];
const SLOT_FOR_TYPE: Record<AvatarItemType, EquippedSlot | 'selectedAvatarId'> = { hat: 'hat', shirt: 'shirt', accessory: 'accessory', frame: 'frame', badge: 'badge', background: 'background', avatar: 'selectedAvatarId' };
export type AvatarPurchaseOperationId = `avatar-purchase:${string}`;

function asAvatarPurchaseOperationId(operationId: string): AvatarPurchaseOperationId | null {
  return /^avatar-purchase:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)
    ? operationId as AvatarPurchaseOperationId
    : null;
}

interface UseAvatarShopProps { userTokens: number; onSpendTokens: (amount: number, reason: string, operationId: string) => Promise<boolean>; onPurchaseComplete?: (operationId: AvatarPurchaseOperationId) => unknown | Promise<unknown>; }

export function useAvatarShop({ userTokens, onSpendTokens, onPurchaseComplete }: UseAvatarShopProps) {
  const [avatarState, setAvatarState] = useState<AvatarState | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastPurchased, setLastPurchased] = useState<ShopItem | null>(null);
  const operationRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setBlocked(false); setActionError(null);
    try { const saved = await dataStore.getAvatarState(); const base = createBaseAvatarState(saved); if (!saved) await dataStore.saveAvatarState(base); setAvatarState(base); }
    catch (cause) { setAvatarState(null); setBlocked(true); setActionError(cause instanceof Error ? cause.message : 'Avatar data could not be opened.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const isOwned = useCallback((item: ShopItem) => avatarState !== null && (item.type === 'avatar' ? avatarState.unlockedAvatars.includes(item.id) : avatarState.ownedItems.includes(item.id)), [avatarState]);
  const isEquipped = useCallback((item: ShopItem) => { if (!avatarState) return false; if (item.type === 'avatar') return avatarState.selectedAvatarId === item.id; const slot = SLOT_FOR_TYPE[item.type]; return slot === 'selectedAvatarId' ? false : avatarState.equippedItems[slot] === item.id; }, [avatarState]);
  const canBuy = useCallback((item: ShopItem) => Boolean(avatarState) && !loading && !blocked && !busy && !avatarState?.pendingPurchase && !isOwned(item) && userTokens >= item.cost, [avatarState, blocked, busy, isOwned, loading, userTokens]);
  const finishPurchase = useCallback(async (state: AvatarState, item: ShopItem) => {
    const next: AvatarState = item.type === 'avatar' ? { ...state, unlockedAvatars: [...new Set([...state.unlockedAvatars, item.id])], pendingPurchase: undefined } : { ...state, ownedItems: [...new Set([...state.ownedItems, item.id])], pendingPurchase: undefined };
    await dataStore.saveAvatarState(next); setAvatarState(next); setActionError(null); setLastPurchased(item); window.setTimeout(() => setLastPurchased(null), 3000);
    const operationId = state.pendingPurchase && asAvatarPurchaseOperationId(state.pendingPurchase.operationId);
    if (!operationId) { logger.error('[avatar-shop] Confirmed purchase has an invalid durable operation ID'); return; }
    try { await onPurchaseComplete?.(operationId); } catch (cause) { logger.error('[avatar-shop] Confirmed purchase achievement callback failed', cause); }
  }, [onPurchaseComplete]);
  const runPending = useCallback(async (state: AvatarState, item: ShopItem) => {
    const intent = state.pendingPurchase; if (!intent) return;
    const spent = await onSpendTokens(intent.cost, intent.reason, intent.operationId);
    if (!spent) { setActionError('Your token payment was not confirmed. Retry this purchase to finish safely.'); return; }
    await finishPurchase(state, item);
  }, [finishPurchase, onSpendTokens]);
  const handleBuy = useCallback(async (item: ShopItem) => {
    const state = avatarState; if (!state || operationRef.current || !canBuy(item)) return;
    if (typeof globalThis.crypto?.randomUUID !== 'function') { setActionError('A secure purchase ID is unavailable. Try again when secure storage is available.'); return; }
    operationRef.current = true; setBusy(true); setActionError(null);
    try { const intent = { schemaVersion: 1 as const, operationId: `avatar-purchase:${globalThis.crypto.randomUUID()}`, itemId: item.id, cost: item.cost, reason: `Bought ${item.name}`, createdAt: Date.now() }; const pending = { ...state, pendingPurchase: intent }; await dataStore.saveAvatarState(pending); setAvatarState(pending); await runPending(pending, item); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Purchase could not be saved. Retry this purchase to finish safely.'); }
    finally { operationRef.current = false; setBusy(false); }
  }, [avatarState, canBuy, runPending]);
  const retryPendingPurchase = useCallback(async () => {
    const state = avatarState; const intent = state?.pendingPurchase; const item = intent ? SHOP_ITEMS.find((candidate) => candidate.id === intent.itemId) : undefined;
    if (!state || !intent || !item || operationRef.current || loading || blocked) return;
    operationRef.current = true; setBusy(true); setActionError(null);
    try { await runPending(state, item); } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Purchase could not be saved. Retry this purchase to finish safely.'); }
    finally { operationRef.current = false; setBusy(false); }
  }, [avatarState, blocked, loading, runPending]);
  const handleEquip = useCallback(async (item: ShopItem) => {
    const state = avatarState; if (!state || operationRef.current || loading || blocked || busy) return;
    const slot = SLOT_FOR_TYPE[item.type]; if (item.type === 'avatar' && !state.unlockedAvatars.includes(item.id)) return; if (slot !== 'selectedAvatarId' && !isOwned(item)) return;
    const next = slot === 'selectedAvatarId' ? { ...state, selectedAvatarId: item.id } : { ...state, equippedItems: { ...state.equippedItems, [slot]: state.equippedItems[slot] === item.id ? undefined : item.id } };
    operationRef.current = true; setBusy(true); setActionError(null);
    try { await dataStore.saveAvatarState(next); setAvatarState(next); } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Avatar equipment could not be saved. Try again.'); }
    finally { operationRef.current = false; setBusy(false); }
  }, [avatarState, blocked, busy, isOwned, loading]);
  return { avatarState, loading, blocked, busy, error: actionError, allItems: SHOP_ITEMS, lastPurchased, isOwned, isEquipped, canBuy, handleBuy, retryPendingPurchase, reload: load, handleEquip };
}
