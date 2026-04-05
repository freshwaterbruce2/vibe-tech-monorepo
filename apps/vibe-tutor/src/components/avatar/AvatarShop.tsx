import { Store, Star, Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { type AvatarState, type ShopItem } from '../../types';
import { dataStore } from '../../services/dataStore';
import { SHOP_ITEMS } from '../../services/avatarShopData';

interface AvatarShopProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason: string) => void;
}

export default function AvatarShop({ userTokens, onSpendTokens }: AvatarShopProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>({
    equippedItems: {},
    ownedItems: [],
  });

  useEffect(() => {
    async function load() {
      const state = await dataStore.getAvatarState();
      if (state) {
        setAvatarState(state);
      }
    }
    void load();
  }, [userTokens]); // re-load if tokens change as a side effect (or just init)

  const handleBuy = async (item: ShopItem) => {
    if (userTokens < item.cost) return;
    if (avatarState.ownedItems.includes(item.id)) return;

    // Deduct tokens
    onSpendTokens(item.cost, `Bought ${item.name}`);

    // Add to inventory
    const newState = {
      ...avatarState,
      ownedItems: [...avatarState.ownedItems, item.id],
    };

    setAvatarState(newState);
    await dataStore.saveAvatarState(newState);
  };

  const handleEquip = async (item: ShopItem) => {
    const newState = {
      ...avatarState,
      equippedItems: {
        ...avatarState.equippedItems,
        [item.type]: item.id,
      },
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Store size={28} color="var(--success-accent)" style={{ marginRight: '12px' }} />
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Avatar Shop</h2>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--background-card)',
            padding: '8px 16px',
            borderRadius: '24px',
            gap: '8px',
          }}
        >
          <Star size={18} color="var(--token-color)" fill="var(--token-color)" />
          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{userTokens}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {SHOP_ITEMS.map((item) => {
          const isOwned = avatarState.ownedItems.includes(item.id);
          const isEquipped = avatarState.equippedItems[item.type] === item.id;
          const canAfford = userTokens >= item.cost;

          return (
            <div
              key={item.id}
              style={{
                background: 'var(--background-card)',
                border: isEquipped ? '2px solid var(--primary-accent)' : '1px solid var(--text-placeholder)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '40px' }}>{item.imageUrl}</div>
                {!isOwned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: canAfford ? 'var(--token-color)' : 'var(--error-accent)' }}>
                    <Star size={14} />
                    <span style={{ fontWeight: 'bold' }}>{item.cost}</span>
                  </div>
                )}
                {isOwned && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-accent)' }}>
                    <Check size={16} />
                    <span style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>Owned</span>
                  </div>
                )}
              </div>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{item.name}</h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)', flexGrow: 1 }}>{item.description}</p>
              
              {/* Stat boosts display */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                {Object.entries(item.statBoosts).map(([stat, val]) => (
                  <span key={stat} style={{ background: 'var(--background-surface)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    +{val} {stat.replace('Power', '')}
                  </span>
                ))}
              </div>

              {isEquipped ? (
                <button
                  disabled
                  style={{
                    background: 'var(--glass-surface)',
                    color: 'var(--primary-accent)',
                    border: '1px solid var(--primary-accent)',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'default',
                  }}
                >
                  Equipped
                </button>
              ) : isOwned ? (
                <button
                  onClick={() => void handleEquip(item)}
                  style={{
                    background: 'var(--success-accent)',
                    color: 'white',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Equip
                </button>
              ) : (
                <button
                  onClick={() => void handleBuy(item)}
                  disabled={!canAfford}
                  style={{
                    background: canAfford ? 'var(--token-color)' : 'var(--text-placeholder)',
                    color: canAfford ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}
                >
                  Buy Item
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
