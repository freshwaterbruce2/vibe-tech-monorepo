import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPlatform = vi.fn(() => 'android');
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => getPlatform() } }));

const dataStoreInit = vi.fn().mockResolvedValue(undefined);
vi.mock('../dataStore', () => ({ dataStore: { initialize: () => dataStoreInit() } }));

const getConnection = vi.fn<() => unknown>(() => ({}));
vi.mock('../databaseService', () => ({
  databaseService: { getConnection: () => getConnection() },
}));

vi.mock('../learningAnalytics', () => ({
  learningAnalytics: { initialize: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../utils/electronStore', () => ({
  appStore: { get: () => null, set: () => {}, delete: () => {} },
}));

const { AppIntegrationService } = await import('../appIntegration');

describe('appIntegration.initialize (single DB-init owner)', () => {
  beforeEach(() => {
    dataStoreInit.mockClear().mockResolvedValue(undefined);
    getConnection.mockReturnValue({});
    getPlatform.mockReturnValue('android');
  });

  it('delegates DB init to dataStore exactly once and reports availability on native', async () => {
    const svc = new AppIntegrationService();
    await svc.initialize();
    expect(dataStoreInit).toHaveBeenCalledTimes(1);
    expect(svc.isDatabaseAvailable()).toBe(true);
  });

  it('does not init the DB on web (localStorage fallback path)', async () => {
    getPlatform.mockReturnValue('web');
    const svc = new AppIntegrationService();
    await svc.initialize();
    expect(dataStoreInit).not.toHaveBeenCalled();
    expect(svc.isDatabaseAvailable()).toBe(false);
  });

  it('reports DB unavailable when the connection is null after init', async () => {
    getConnection.mockReturnValue(null);
    const svc = new AppIntegrationService();
    await svc.initialize();
    expect(svc.isDatabaseAvailable()).toBe(false);
  });
});
