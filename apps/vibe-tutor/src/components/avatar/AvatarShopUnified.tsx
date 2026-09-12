import { ChevronLeft, Star } from 'lucide-react';
import { useState } from 'react';
import type { ShopItem } from '@vibetech/avatars';
import { AvatarImage } from '@vibetech/avatars';
import { AvatarPreview } from './AvatarPreview';
import { type AvatarPurchaseOperationId, useAvatarShop } from './useAvatarShop';

type TabId = 'Characters' | 'Hats' | 'Shirts' | 'Accessories' | 'Frames' | 'Badges' | 'Backgrounds';

const TABS: { id: TabId; type: string; emoji: string }[] = [
  { id: 'Characters', type: 'avatar', emoji: '🧑' },
  { id: 'Hats', type: 'hat', emoji: '🧢' },
  { id: 'Shirts', type: 'shirt', emoji: '👕' },
  { id: 'Accessories', type: 'accessory', emoji: '🎒' },
  { id: 'Frames', type: 'frame', emoji: '✨' },
  { id: 'Badges', type: 'badge', emoji: '🏅' },
  { id: 'Backgrounds', type: 'background', emoji: '🌌' },
];

const RARITY_COLOR: Record<string, string> = {
  common: 'text-slate-400',
  rare: 'text-sky-400',
  epic: 'text-violet-400',
  legendary: 'text-amber-400',
};

interface ItemCardProps {
  item: ShopItem;
  isOwned: boolean;
  isEquipped: boolean;
  canBuy: boolean;
  busy: boolean;
  userTokens: number;
  onBuy: () => void;
  onEquip: () => void;
}

function ItemCard({ item, isOwned, isEquipped, canBuy, busy, userTokens, onBuy, onEquip }: ItemCardProps) {
  const rarityClass = item.rarity ? (RARITY_COLOR[item.rarity] ?? '') : '';

  return (
    <div
      className={`glass-card rounded-2xl p-3 flex flex-col gap-2 border-2 transition-all ${
        isEquipped ? 'border-[var(--primary-accent)]' : 'border-transparent'
      }`}
    >
      {/* Item visual */}
      <div className="relative flex items-center justify-center h-20 rounded-xl overflow-hidden">
        {item.type === 'background' && item.twClasses ? (
          <>
            <div className={`absolute inset-0 ${item.twClasses}`} />
            <span className="relative z-10 text-3xl">{item.imageUrl}</span>
          </>
        ) : item.type === 'frame' && item.twClasses ? (
          <>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800" />
            <div className={`absolute inset-0 rounded-xl pointer-events-none ${item.twClasses}`} />
            <span className="relative z-10 text-2xl">{item.imageUrl}</span>
          </>
        ) : item.type === 'avatar' ? (
          <AvatarImage src={item.imageUrl} alt={item.name} size={72} />
        ) : (
          <span className="text-4xl">
            {item.type === 'badge' ? (item.badgeEmoji ?? item.imageUrl) : item.imageUrl}
          </span>
        )}
      </div>

      {/* Name & rarity */}
      <div>
        <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">{item.name}</p>
        {item.rarity && (
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${rarityClass}`}>{item.rarity}</p>
        )}
      </div>

      {/* Action button */}
      {isEquipped ? (
        <button
          onClick={onEquip}
          disabled={busy}
          className="w-full py-2 rounded-xl text-sm font-semibold border-2 border-[var(--primary-accent)] text-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/10 transition-all"
        >
          ✓ Equipped · Unequip
        </button>
      ) : isOwned ? (
        <button
          onClick={onEquip}
          disabled={busy}
          className="w-full py-2 rounded-xl text-sm font-bold bg-[var(--success-accent)]/20 text-[var(--success-accent)] hover:bg-[var(--success-accent)]/30 transition-all"
        >
          Equip
        </button>
      ) : (
        <button
          onClick={onBuy}
          disabled={!canBuy}
          className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${
            canBuy
              ? 'glass-button text-white hover:scale-[1.02]'
              : 'bg-[var(--glass-border)] text-[var(--text-secondary)] cursor-not-allowed opacity-60'
          }`}
        >
          {canBuy
            ? `Buy ${item.cost} 💎`
            : `Need ${item.cost - userTokens} more`}
        </button>
      )}
    </div>
  );
}

interface AvatarShopUnifiedProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason: string, operationId: string) => Promise<boolean>;
  onPurchaseComplete?: (operationId: AvatarPurchaseOperationId) => unknown | Promise<unknown>;
  onClose?: () => void;
}

export function AvatarShopUnified({
  userTokens,
  onSpendTokens,
  onPurchaseComplete,
  onClose,
}: AvatarShopUnifiedProps) {
  const [activeTab, setActiveTab] = useState<TabId>('Characters');
  const { avatarState, loading, blocked, busy, error, allItems, lastPurchased, isOwned, isEquipped, canBuy, handleBuy, retryPendingPurchase, reload, handleEquip } =
    useAvatarShop({ userTokens, onSpendTokens, onPurchaseComplete });

  const activeType = TABS.find((t) => t.id === activeTab)?.type ?? 'avatar';
  const filteredItems = allItems.filter((item) => item.type === activeType);

  return (
    <div className="min-h-full flex flex-col bg-[var(--background-main)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[var(--background-main)] border-b border-[var(--glass-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="glass-card p-2 rounded-lg shrink-0"
              aria-label="Close shop"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {avatarState && <AvatarPreview avatarState={avatarState} allItems={allItems} size={56} className="shrink-0" />}

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold neon-text-primary leading-tight">My Avatar</h1>
            <p className="text-xs text-[var(--text-secondary)]">Spend tokens to customize your look</p>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--background-card)] px-3 py-1.5 rounded-full shrink-0">
            <Star size={14} className="text-[var(--token-color)]" fill="var(--token-color)" />
            <span className="text-sm font-bold tabular-nums">{userTokens}</span>
          </div>
        </div>

        {/* Tab row */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              disabled={loading || blocked || busy}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[var(--primary-accent)] text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                  : 'bg-[var(--glass-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.emoji} {tab.id}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-[var(--text-secondary)] py-16" role="status">Loading avatar shop…</p>
        ) : blocked ? (
          <section className="text-center text-[var(--text-secondary)] py-16" role="alert">
            <p>{error}</p>
            <button className="glass-button mt-4 px-4 py-2 rounded-xl" onClick={() => { void reload(); }}>Reload avatar shop</button>
          </section>
        ) : avatarState ? (
          <>
            {(error || avatarState.pendingPurchase) && (
              <section role="alert" className="mb-4 text-[var(--error-accent)]">
                {error && <p>{error}</p>}
                {avatarState.pendingPurchase && (
                  <>
                    <p>Finish your saved purchase safely.</p>
                    <button className="glass-button mt-2 px-4 py-2 rounded-xl" disabled={busy} onClick={() => { void retryPendingPurchase(); }}>Retry purchase</button>
                  </>
                )}
              </section>
            )}
            {filteredItems.length === 0 ? (
              <p className="text-center text-[var(--text-secondary)] py-16">No items available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} item={item} isOwned={isOwned(item)} isEquipped={isEquipped(item)} canBuy={canBuy(item)} busy={busy} userTokens={userTokens} onBuy={() => { void handleBuy(item); }} onEquip={() => { void handleEquip(item); }} />
                ))}
              </div>
            )}
          </>
        ) : <p className="text-center text-[var(--text-secondary)] py-16" role="status">Preparing avatar shop…</p>}
      </div>

      {/* Purchase success toast */}
      {lastPurchased && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--primary-accent)] text-white px-5 py-3 rounded-2xl shadow-xl text-center pointer-events-none animate-bounce">
          <div className="font-bold text-base">{lastPurchased.imageUrl} Got it!</div>
          <div className="text-sm opacity-80">{lastPurchased.name}</div>
        </div>
      )}
    </div>
  );
}
