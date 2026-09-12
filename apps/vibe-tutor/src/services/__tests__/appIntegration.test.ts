import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPlatform, dataStoreInit, getConnection, analyticsInit, achievementInit } = vi.hoisted(
  () => ({
    getPlatform: vi.fn(() => 'android'),
    dataStoreInit: vi.fn(),
    getConnection: vi.fn<() => unknown>(() => ({})),
    analyticsInit: vi.fn(),
    achievementInit: vi.fn(),
  }),
);

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform } }));
vi.mock('../dataStore', () => ({ dataStore: { initialize: dataStoreInit } }));
vi.mock('../databaseService', () => ({ databaseService: { getConnection } }));
vi.mock('../learningAnalytics', () => ({ learningAnalytics: { initialize: analyticsInit } }));
vi.mock('../achievementService', () => ({ initializeAchievements: achievementInit }));

const { AppIntegrationService } = await import('../appIntegration');

describe('appIntegration.initialize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlatform.mockReturnValue('android');
    getConnection.mockReturnValue({});
    dataStoreInit.mockResolvedValue(undefined);
    analyticsInit.mockResolvedValue(undefined);
    achievementInit.mockResolvedValue(undefined);
  });

  it('initializes native dependencies and exposes database availability', async () => {
    const order: string[] = [];
    dataStoreInit.mockImplementation(async () => {
      order.push('dataStore');
    });
    achievementInit.mockImplementation(async () => {
      order.push('achievements');
    });
    analyticsInit.mockImplementation(async () => {
      order.push('analytics');
    });
    const service = new AppIntegrationService();
    await service.initialize();
    expect(dataStoreInit).toHaveBeenCalledTimes(1);
    expect(analyticsInit).toHaveBeenCalledTimes(1);
    expect(achievementInit).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['dataStore', 'achievements', 'analytics']);
    expect(service.isDatabaseAvailable()).toBe(true);
  });

  it('initializes the shared lifecycle store on web without marking native storage available', async () => {
    getPlatform.mockReturnValue('web');
    const service = new AppIntegrationService();
    await service.initialize();
    expect(dataStoreInit).toHaveBeenCalledTimes(1);
    expect(achievementInit).toHaveBeenCalledTimes(1);
    expect(service.isDatabaseAvailable()).toBe(false);
  });

  it('rejects native initialization when dataStore resolves without a live connection', async () => {
    getConnection.mockReturnValue(null);
    const service = new AppIntegrationService();
    await expect(service.initialize()).rejects.toThrow('Native SQLite storage is unavailable');
    expect(service.isDatabaseAvailable()).toBe(false);
  });

  it('shares one concurrent initialization', async () => {
    let resolveInit: () => void = () => undefined;
    dataStoreInit.mockImplementation(
      async () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        }),
    );
    const service = new AppIntegrationService();
    const first = service.initialize();
    const second = service.initialize();
    expect(dataStoreInit).toHaveBeenCalledTimes(1);
    resolveInit();
    await Promise.all([first, second]);
    expect(analyticsInit).toHaveBeenCalledTimes(1);
  });

  it('shares a native null-connection failure and can retry after the connection returns', async () => {
    getConnection.mockReturnValue(null);
    const service = new AppIntegrationService();
    const first = service.initialize();
    const second = service.initialize();

    await expect(Promise.all([first, second])).rejects.toThrow(
      'Native SQLite storage is unavailable',
    );
    expect(dataStoreInit).toHaveBeenCalledTimes(1);

    getConnection.mockReturnValue({});
    await expect(service.initialize()).resolves.toBeUndefined();
    expect(dataStoreInit).toHaveBeenCalledTimes(2);
    expect(service.isDatabaseAvailable()).toBe(true);
  });

  it('does not report success after failure and can retry initialization', async () => {
    dataStoreInit
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(undefined);
    const service = new AppIntegrationService();
    await expect(service.initialize()).rejects.toThrow('database unavailable');
    expect(service.isDatabaseAvailable()).toBe(false);

    await expect(service.initialize()).resolves.toBeUndefined();
    expect(dataStoreInit).toHaveBeenCalledTimes(2);
    expect(service.isDatabaseAvailable()).toBe(true);
  });

  it('does not advance analytics after achievement initialization fails and retries cleanly', async () => {
    achievementInit
      .mockRejectedValueOnce(new Error('achievement storage unavailable'))
      .mockResolvedValueOnce(undefined);
    const service = new AppIntegrationService();
    await expect(service.initialize()).rejects.toThrow('achievement storage unavailable');
    expect(analyticsInit).not.toHaveBeenCalled();
    await expect(service.initialize()).resolves.toBeUndefined();
    expect(achievementInit).toHaveBeenCalledTimes(2);
    expect(analyticsInit).toHaveBeenCalledTimes(1);
  });
});
