import { beforeEach, describe, expect, it, vi } from 'vitest';
const store = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn(async () => store) }));

describe('AI funding preference', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.unstubAllEnvs(); });
  it('defaults new installations to BYOK without implicitly choosing a subscription', async () => {
    store.get.mockResolvedValue(undefined);
    const mode = await import('../../services/AIUsageMode');
    await mode.initializeAIUsageMode();
    expect(mode.activeAIUsageMode).toBe('byok');
    expect(mode.useAIProxy).toBe(false);
  });
  it('keeps the active subscription fixed when a personal-key preference is saved', async () => {
    store.get.mockResolvedValue('subscription');
    const mode = await import('../../services/AIUsageMode');
    await mode.initializeAIUsageMode();
    await mode.saveAIUsageMode('byok');
    expect(mode.getSavedAIUsageMode()).toBe('byok');
    expect(mode.activeAIUsageMode).toBe('subscription');
    expect(mode.useAIProxy).toBe(true);
    expect(store.save).toHaveBeenCalled();
  });
  it('rejects unreadable preferences rather than silently selecting personal billing', async () => {
    store.get.mockResolvedValue('broken-value');
    const mode = await import('../../services/AIUsageMode');
    await expect(mode.initializeAIUsageMode()).rejects.toThrow('could not be read');
  });
  it('allows HTTPS hosting and loopback development, rejects remote HTTP and URL credentials', async () => {
    const { validateBackendUrl } = await import('../../services/AIUsageMode');
    expect(validateBackendUrl('https://api.example.com')).toBe('https://api.example.com');
    expect(validateBackendUrl('http://localhost:5004')).toBe('http://localhost:5004');
    expect(() => validateBackendUrl('http://api.example.com')).toThrow();
    expect(() => validateBackendUrl('https://user:password@api.example.com')).toThrow();
  });
});
