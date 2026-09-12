import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_UNLOCKED_AVATAR_IDS, SHOP_ITEMS } from '../avatarShopData';

const { query, run } = vi.hoisted(() => ({ query: vi.fn(), run: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('../databaseService', () => ({ databaseService: { getConnection: () => ({ query, run }), initialize: vi.fn(), runInTransaction: vi.fn() } }));
vi.mock('../migrationService', () => ({ migrationService: { isMigrationComplete: vi.fn(), performMigration: vi.fn() } }));
vi.mock('../../utils/electronStore', () => ({ appStore: { getStrict: vi.fn(), setStrict: vi.fn(), get: vi.fn(), set: vi.fn() } }));

const { DataStore } = await import('../dataStore');
const avatarId = DEFAULT_UNLOCKED_AVATAR_IDS[0]!;
const gear = SHOP_ITEMS.find((item) => item.type === 'hat')!;
const validState = { equippedItems: { hat: gear.id }, ownedItems: [gear.id], unlockedAvatars: [avatarId], selectedAvatarId: avatarId };

describe('DataStore avatar persistence (SQLite)', () => {
  let store: InstanceType<typeof DataStore>;
  beforeEach(() => { vi.clearAllMocks(); query.mockReset(); run.mockReset(); run.mockResolvedValue(undefined); store = new DataStore(); (store as unknown as { useSQLite: boolean }).useSQLite = true; });

  it('reads canonical valid JSON and does not query legacy state', async () => {
    query.mockResolvedValueOnce({ values: [{ value: JSON.stringify(validState) }] });
    await expect(store.getAvatarState()).resolves.toEqual(validState);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each(['{', JSON.stringify({ ownedItems: [], unlockedAvatars: [] })])('propagates malformed canonical SQLite state (%s)', async (value) => {
    query.mockResolvedValueOnce({ values: [{ value }] });
    await expect(store.getAvatarState()).rejects.toThrow();
  });

  it('propagates canonical SQLite query failures', async () => {
    query.mockRejectedValueOnce(new Error('SQLite unavailable'));
    await expect(store.getAvatarState()).rejects.toThrow('SQLite unavailable');
  });

  it('uses valid legacy only after canonical is missing', async () => {
    query.mockResolvedValueOnce({ values: [] }).mockResolvedValueOnce({ values: [{ value: '🐉' }] });
    await expect(store.getAvatarState()).resolves.toMatchObject({ selectedAvatarId: 'avatar-boy-headphones' });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed legacy selection instead of normalizing an unknown value', async () => {
    query.mockResolvedValueOnce({ values: [] }).mockResolvedValueOnce({ values: [{ value: 'unknown-legacy-avatar' }] });
    await expect(store.getAvatarState()).rejects.toThrow('Legacy avatar selection');
  });

  it('writes validated canonical JSON with parameterized SQL and surfaces SQLite writes', async () => {
    await store.saveAvatarState(validState);
    expect(run.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS user_settings');
    expect(run.mock.calls[1]).toEqual([expect.stringContaining('INSERT OR REPLACE INTO user_settings'), ['avatarState', JSON.stringify(validState)]]);
    run.mockRejectedValueOnce(new Error('create failed'));
    await expect(store.saveAvatarState(validState)).rejects.toThrow('create failed');
    run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('insert failed'));
    await expect(store.saveAvatarState(validState)).rejects.toThrow('insert failed');
  });

  it('validates before any SQLite write', async () => {
    await expect(store.saveAvatarState({ ...validState, ownedItems: ['unknown-item'] } as never)).rejects.toThrow(/avatar/i);
    expect(run).not.toHaveBeenCalled();
  });
});
