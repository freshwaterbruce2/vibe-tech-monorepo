import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPlatform: vi.fn(() => 'android'),
  getUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
  getStrict: vi.fn(),
  setStrict: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: mocks.getPlatform } }));
vi.mock('../dataStore', () => ({ dataStore: { getUserSettings: mocks.getUserSettings, saveUserSettings: mocks.saveUserSettings } }));
vi.mock('../../utils/electronStore', () => ({ appStore: { getStrict: mocks.getStrict, setStrict: mocks.setStrict } }));

import { __resetTokenServiceForTests, earnTokens, getTokenBalance, initializeTokenLedger, subscribeToTokenChanges } from '../tokenService';

describe('tokenService Android durable storage boundary', () => {
  beforeEach(() => {
    __resetTokenServiceForTests();
    mocks.getPlatform.mockReturnValue('android');
    mocks.getUserSettings.mockReset();
    mocks.saveUserSettings.mockReset();
    mocks.getStrict.mockReset();
    mocks.setStrict.mockReset();
    mocks.getStrict.mockReturnValue(null);
    mocks.getUserSettings.mockResolvedValue(null);
    mocks.saveUserSettings.mockResolvedValue(undefined);
  });

  it('initializes and writes the canonical ledger through dataStore, never the web store', async () => {
    await initializeTokenLedger();
    expect(mocks.getUserSettings).toHaveBeenCalledWith('vibetutor_token_ledger_v3');
    expect(mocks.saveUserSettings).toHaveBeenCalledWith('vibetutor_token_ledger_v3', expect.any(String));
    expect(mocks.setStrict).not.toHaveBeenCalled();
  });

  it('does not publish or change the balance when a native mutation write fails', async () => {
    await initializeTokenLedger();
    mocks.saveUserSettings.mockRejectedValueOnce(new Error('native write failed'));
    const listener = vi.fn();
    subscribeToTokenChanges(listener);
    await expect(earnTokens(5, 'Native test', 'native:write-fail')).resolves.toMatchObject({ ok: false, reason: 'persistence_failed' });
    expect(getTokenBalance()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('fails closed after repeated native read failures', async () => {
    mocks.getUserSettings.mockRejectedValue(new Error('native read failed'));
    await expect(initializeTokenLedger()).rejects.toThrow('native read failed');
    await expect(earnTokens(5, 'Native test', 'native:read-fail')).resolves.toMatchObject({ ok: false, reason: 'not_initialized' });
    expect(getTokenBalance()).toBe(0);
  });
});
