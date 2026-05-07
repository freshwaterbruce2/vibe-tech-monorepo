import { Zap, Sparkles, BookOpen, Brain, Activity, type LucideProps } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { type AvatarState, type AvatarStat, type ShopItem } from '../../types';
import { dataStore } from '../../services/dataStore';
import {
  DEFAULT_UNLOCKED_AVATAR_IDS,
  SHOP_ITEMS,
  normalizeAvatarId,
} from '../../services/avatarShopData';
import { AvatarPreview } from './AvatarPreview';

function createAvatarState(saved?: Partial<AvatarState> | null, legacyAvatar?: string): AvatarState {
  const selectedAvatarId = normalizeAvatarId(saved?.selectedAvatarId ?? legacyAvatar);

  return {
    equippedItems: saved?.equippedItems ?? {},
    ownedItems: saved?.ownedItems ?? [],
    purchaseHistory: saved?.purchaseHistory ?? [],
    selectedAvatarId,
    unlockedAvatars: [
      ...new Set([
        ...DEFAULT_UNLOCKED_AVATAR_IDS,
        ...(saved?.unlockedAvatars ?? []),
        selectedAvatarId,
      ]),
    ],
  };
}

const STAT_ICONS: Record<AvatarStat, React.ComponentType<LucideProps>> = {
  mathPower: CalculatorIcon,
  sciencePower: Zap,
  historyPower: BookOpen,
  logicPower: Brain,
  creativity: Sparkles,
};

const STAT_LABELS: Record<AvatarStat, string> = {
  mathPower: 'Math Power',
  sciencePower: 'Science Power',
  historyPower: 'History Power',
  logicPower: 'Logic Power',
  creativity: 'Creativity',
};

// Simple calculator icon wrapper since it wasn't explicitly imported
function CalculatorIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="10" y2="10" />
      <line x1="12" x2="12" y1="10" y2="10" />
      <line x1="8" x2="8" y1="10" y2="10" />
      <line x1="16" x2="16" y1="14" y2="14" />
      <line x1="12" x2="12" y1="14" y2="14" />
      <line x1="8" x2="8" y1="14" y2="14" />
      <line x1="16" x2="16" y1="18" y2="18" />
      <line x1="12" x2="12" y1="18" y2="18" />
      <line x1="8" x2="8" y1="18" y2="18" />
    </svg>
  );
}

interface AvatarProfileProps {
  onOpenShop?: () => void;
}

export default function AvatarProfile({ onOpenShop }: AvatarProfileProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>(() => createAvatarState());

  useEffect(() => {
    async function load() {
      const [state, legacyAvatar] = await Promise.all([
        dataStore.getAvatarState(),
        dataStore.getUserSettings('user_avatar'),
      ]);
      setAvatarState(createAvatarState(state, legacyAvatar));
    }
    void load();
  }, []);

  const selectedAvatarItem = useMemo(
    () => SHOP_ITEMS.find((item) => item.id === avatarState.selectedAvatarId && item.type === 'avatar'),
    [avatarState.selectedAvatarId],
  );

  const equippedShopItems = useMemo(() => {
    const items: ShopItem[] = [];
    if (avatarState.equippedItems.hat) {
      const item = SHOP_ITEMS.find((i) => i.id === avatarState.equippedItems.hat);
      if (item) items.push(item);
    }
    if (avatarState.equippedItems.shirt) {
      const item = SHOP_ITEMS.find((i) => i.id === avatarState.equippedItems.shirt);
      if (item) items.push(item);
    }
    if (avatarState.equippedItems.accessory) {
      const item = SHOP_ITEMS.find((i) => i.id === avatarState.equippedItems.accessory);
      if (item) items.push(item);
    }
    return items;
  }, [avatarState.equippedItems]);

  const totalStats = useMemo(() => {
    const stats: Record<AvatarStat, number> = {
      mathPower: 1,
      sciencePower: 1,
      historyPower: 1,
      logicPower: 1,
      creativity: 1,
    };

    for (const item of equippedShopItems) {
      for (const [stat, boost] of Object.entries(item.statBoosts)) {
        if (boost) {
          stats[stat as AvatarStat] += boost;
        }
      }
    }
    return stats;
  }, [equippedShopItems]);

  const handleUnequip = async (type: 'hat' | 'shirt' | 'accessory') => {
    const newState = {
      ...avatarState,
      equippedItems: { ...avatarState.equippedItems, [type]: undefined },
    };
    setAvatarState(newState);
    await dataStore.saveAvatarState(newState);
  };

  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--background-surface)',
        borderRadius: '16px',
        color: 'white',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <Activity size={28} color="var(--success-accent)" style={{ marginRight: '12px', flexShrink: 0 }} />
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Avatar Profile</h2>
        </div>
        {onOpenShop && (
          <button
            onClick={onOpenShop}
            style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Sparkles size={16} /> Open Shop
          </button>
        )}
      </div>

      <div
        className="mb-6"
        style={{
          alignItems: 'center',
          background: 'var(--background-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px',
          padding: '16px',
        }}
      >
        <AvatarPreview avatarState={avatarState} allItems={SHOP_ITEMS} size={132} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>
            Selected Avatar
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
            {selectedAvatarItem?.name ?? 'Focus Gamer'}
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            {selectedAvatarItem?.description ?? 'A focused learner ready for the next challenge.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Equipped Items */}
        <div style={{ background: 'var(--background-card)', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-secondary)' }}>
            Equipped Gear
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(['hat', 'shirt', 'accessory'] as const).map((type) => {
              const itemId = avatarState.equippedItems[type];
              const item = itemId ? SHOP_ITEMS.find((i) => i.id === itemId) : null;

              return (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--background-surface)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--text-placeholder)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--text-placeholder)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                      }}
                    >
                      {item ? item.imageUrl : '❌'}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {type}
                      </div>
                      <div style={{ fontWeight: '500' }}>{item ? item.name : 'Empty Slot'}</div>
                    </div>
                  </div>
                  {item && (
                    <button
                      onClick={() => void handleUnequip(type)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--error-accent)',
                        color: 'var(--error-accent)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Unequip
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: 'var(--background-card)', padding: '16px', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text-secondary)' }}>Battle Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(Object.keys(STAT_LABELS) as AvatarStat[]).map((stat) => {
              const Icon = STAT_ICONS[stat];
              const value = totalStats[stat];
              const isBoosted = value > 1;

              return (
                <div
                  key={stat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--background-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={18} color={isBoosted ? '#a855f7' : 'var(--text-muted)'} />
                    <span style={{ color: isBoosted ? 'white' : 'var(--text-secondary)' }}>
                      {STAT_LABELS[stat]}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: 'bold',
                      color: isBoosted ? '#a855f7' : 'white',
                      backgroundColor: isBoosted ? '#a855f722' : 'transparent',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    x{value} Multiplier
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
