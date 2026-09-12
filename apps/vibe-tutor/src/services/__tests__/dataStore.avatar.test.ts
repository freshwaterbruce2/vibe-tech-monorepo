import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_UNLOCKED_AVATAR_IDS, SHOP_ITEMS } from '../avatarShopData';

const { getStrict, setStrict, query, run } = vi.hoisted(() => ({
  getStrict: vi.fn(), setStrict: vi.fn(), query: vi.fn(), run: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
vi.mock('../databaseService', () => ({ databaseService: { getConnection: () => ({ query, run }), initialize: vi.fn(), runInTransaction: vi.fn() } }));
vi.mock('../migrationService', () => ({ migrationService: { isMigrationComplete: vi.fn(), performMigration: vi.fn() } }));
vi.mock('../../utils/electronStore', () => ({
  appStore: { getStrict, setStrict, get: vi.fn(() => { throw new Error('permissive read must not be used'); }), set: vi.fn(() => { throw new Error('permissive write must not be used'); }) },
}));

const { DataStore } = await import('../dataStore');
const avatarId = DEFAULT_UNLOCKED_AVATAR_IDS[0]!;
const gear = SHOP_ITEMS.find((item) => item.type === 'hat')!;
const unownedGear = SHOP_ITEMS.find((item) => item.id !== gear.id && item.type !== 'avatar')!;
const state = () => ({ equippedItems: { hat: gear.id }, ownedItems: [gear.id], unlockedAvatars: [avatarId], selectedAvatarId: avatarId });

describe('DataStore avatar persistence', () => {
  let store: InstanceType<typeof DataStore>;
  beforeEach(() => {
    vi.clearAllMocks();
    getStrict.mockReturnValue(null); setStrict.mockImplementation(() => undefined);
    store = new DataStore();
    (store as unknown as { useSQLite: boolean }).useSQLite = false;
  });

  it('uses strict web storage for canonical valid avatar state and persists only canonical data', async () => {
    getStrict.mockImplementation((key: string) => key === 'avatarState' ? state() : null);
    await expect(store.getAvatarState()).resolves.toEqual(state());
    await store.saveAvatarState(state());
    expect(getStrict).toHaveBeenCalledWith('avatarState');
    expect(setStrict).toHaveBeenCalledWith('avatarState', state());
  });

  it('propagates strict web read and write failures without a permissive fallback', async () => {
    getStrict.mockImplementation(() => { throw new Error('read unavailable'); });
    await expect(store.getAvatarState()).rejects.toThrow('read unavailable');
    setStrict.mockImplementation(() => { throw new Error('write unavailable'); });
    await expect(store.saveAvatarState(state())).rejects.toThrow('write unavailable');
  });

  it.each([
    ['malformed object', { ownedItems: [], unlockedAvatars: [] }],
    ['unknown owned item', { ...state(), ownedItems: ['not-real'] }],
    ['duplicate owned item', { ...state(), ownedItems: [gear.id, gear.id] }],
    ['over-cap owned items', { ...state(), ownedItems: Array.from({ length: SHOP_ITEMS.length + 1 }, () => gear.id) }],
    ['over-cap unlocked avatars', { ...state(), unlockedAvatars: Array.from({ length: DEFAULT_UNLOCKED_AVATAR_IDS.length + 1 }, () => avatarId) }],
    ['wrong-slot equipment', { ...state(), equippedItems: { shirt: gear.id } }],
    ['unowned equipment', { ...state(), ownedItems: [], equippedItems: { hat: gear.id } }],
    ['extra equipment field', { ...state(), equippedItems: { hat: gear.id, surprise: 'x' } }],
    ['invalid history', { ...state(), purchaseHistory: [{ itemId: '', date: 'bad', cost: -1 }] }],
    ['over-cap history', { ...state(), purchaseHistory: Array.from({ length: 101 }, () => ({ itemId: gear.id, date: '2026-01-01', cost: 1 })) }],
    ['invalid pending UUID', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:not-a-uuid', itemId: gear.id, cost: 10, reason: 'Bought cap', createdAt: 1 } }],
    ['pending already owned', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: gear.id, cost: 1, reason: 'Bought cap', createdAt: 1 } }],
  ])('rejects %s before publishing or deleting state', async (_label, invalid) => {
    await expect(store.saveAvatarState(invalid as never)).rejects.toThrow(/avatar/i);
    expect(setStrict).not.toHaveBeenCalled();
  });

  it.each([
    ['non-string selected avatar', { ...state(), selectedAvatarId: 42 }],
    ['empty Bought reason', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 1, reason: 'Bought ', createdAt: 1 } }],
    ['whitespace-padded reason', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 1, reason: ' Bought cap ', createdAt: 1 } }],
    ['zero pending cost', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 0, reason: 'Bought cap', createdAt: 1 } }],
    ['over-cap pending cost', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 1_000_001, reason: 'Bought cap', createdAt: 1 } }],
    ['negative pending timestamp', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 1, reason: 'Bought cap', createdAt: -1 } }],
    ['unsafe pending timestamp', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 1, reason: 'Bought cap', createdAt: Number.MAX_SAFE_INTEGER + 1 } }],
    ['unknown pending item', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: 'unknown-item', cost: 1, reason: 'Bought cap', createdAt: 1 } }],
    ['pending unlocked avatar', { ...state(), pendingPurchase: { schemaVersion: 1, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: avatarId, cost: 1, reason: 'Bought avatar', createdAt: 1 } }],
  ])('rejects %s persisted input', async (_label, invalid) => {
    await expect(store.saveAvatarState(invalid as never)).rejects.toThrow(/avatar/i);
  });

  it('retains a valid pending intent snapshot without re-pricing it from the current catalog', async () => {
    const pending = { schemaVersion: 1 as const, operationId: 'avatar-purchase:123e4567-e89b-42d3-a456-426614174000', itemId: unownedGear.id, cost: 999999, reason: 'Bought a previously selected item', createdAt: 1 };
    getStrict.mockImplementation((key: string) => key === 'avatarState' ? { ...state(), pendingPurchase: pending } : null);
    await expect(store.getAvatarState()).resolves.toMatchObject({ pendingPurchase: pending });
  });

  it('uses canonical state before legacy and permits only a valid legacy fallback', async () => {
    getStrict.mockImplementation((key: string) => key === 'avatarState' ? state() : '🐉');
    await expect(store.getAvatarState()).resolves.toEqual(state());
    expect(getStrict).not.toHaveBeenCalledWith('user_avatar');
    getStrict.mockImplementation((key: string) => key === 'avatarState' ? null : '🐉');
    await expect(store.getAvatarState()).resolves.toMatchObject({ selectedAvatarId: 'avatar-boy-headphones' });
    getStrict.mockImplementation((key: string) => key === 'avatarState' ? null : { wrong: true });
    await expect(store.getAvatarState()).rejects.toThrow('Legacy avatar selection');
    getStrict.mockImplementation((key: string) => key === 'avatarState' ? null : 'unknown-legacy-avatar');
    await expect(store.getAvatarState()).rejects.toThrow('Legacy avatar selection');
  });
});
