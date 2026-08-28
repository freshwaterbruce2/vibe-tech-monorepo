import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureApiKeyManager } from './SecureApiKeyManager';

// Mock fetch globally
global.fetch = vi.fn() as any;

describe('SecureApiKeyManager', () => {
  let manager: SecureApiKeyManager;
  let electronStore: Map<string, unknown>;
  let mockElectronStorage: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();

    // Reset fetch mock
    vi.clearAllMocks();

    electronStore = new Map();
    mockElectronStorage = {
      get: vi.fn(async (key: string) => ({ success: true, value: electronStore.get(key) })),
      set: vi.fn(async (key: string, value: unknown) => {
        electronStore.set(key, value);
        return { success: true };
      }),
      remove: vi.fn(async (key: string) => {
        electronStore.delete(key);
        return { success: true };
      }),
      keys: vi.fn(async () => ({ success: true, keys: Array.from(electronStore.keys()) })),
    };

    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { storage: mockElectronStorage },
    });

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        setTempEnvVar: vi.fn(),
        clearTempEnvVar: vi.fn(),
      },
    });

    Reflect.set(SecureApiKeyManager, 'instance', undefined);

    // Get fresh instance
    manager = SecureApiKeyManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = SecureApiKeyManager.getInstance();
      const instance2 = SecureApiKeyManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('validateApiKey', () => {
    it('validates DeepSeek API keys', () => {
      const validKey = 'sk-' + 'a'.repeat(32);
      expect(manager.validateApiKey(validKey, 'DEEPSEEK')).toBe(true);
    });

    it('validates OpenAI API keys', () => {
      const validKey = 'sk-' + 'A'.repeat(48);
      expect(manager.validateApiKey(validKey, 'OPENAI')).toBe(true);
    });

    it('validates Anthropic API keys', () => {
      const validKey = 'sk-ant-' + 'a'.repeat(95);
      expect(manager.validateApiKey(validKey, 'ANTHROPIC')).toBe(true);
    });

    it('rejects keys shorter than 20 characters', () => {
      expect(manager.validateApiKey('short', 'OPENAI')).toBe(false);
    });

    it('rejects keys with suspicious patterns', () => {
      const suspiciousKeys = [
        'sk-<script>alert</script>',
        'sk-javascript:void',
        'sk-eval(bad)',
        'sk-../../../path',
      ];

      suspiciousKeys.forEach((key) => {
        expect(manager.validateApiKey(key, 'OPENAI')).toBe(false);
      });
    });

    it('handles case-insensitive provider names', () => {
      const validKey = 'sk-' + 'a'.repeat(32);
      expect(manager.validateApiKey(validKey, 'deepseek')).toBe(true);
      expect(manager.validateApiKey(validKey, 'DEEPSEEK')).toBe(true);
    });
  });

  describe('encryptApiKey and decryptApiKey', () => {
    it('encrypts and decrypts API keys', () => {
      const originalKey = 'sk-' + 'test'.repeat(12);

      const encrypted = manager.encryptApiKey(originalKey);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalKey);

      const decrypted = manager.decryptApiKey(encrypted);
      expect(decrypted).toBe(originalKey);
    });

    it('throws error when decrypting invalid data', () => {
      expect(() => manager.decryptApiKey('invalid-data')).toThrow();
    });
  });

  describe('storeApiKey and getApiKey', () => {
    it('stores and retrieves API keys', async () => {
      const validKey = 'sk-' + 'a'.repeat(48);

      const stored = await manager.storeApiKey('OPENAI', validKey);
      expect(stored).toBe(true);

      const retrieved = await manager.getApiKey('OPENAI');
      expect(retrieved).toBe(validKey);
    });

    it('rejects invalid API keys', async () => {
      const invalidKey = 'invalid-key';

      const stored = await manager.storeApiKey('OPENAI', invalidKey);
      expect(stored).toBe(false);
    });

    it('encrypts keys in storage', async () => {
      const validKey = 'sk-' + 'a'.repeat(48);

      await manager.storeApiKey('OPENAI', validKey);

      expect(localStorage.getItem('secure_api_key_openai')).toBeNull();
      const storedData = String(electronStore.get('secure_api_key_openai'));
      expect(storedData).toBeDefined();
      expect(storedData).not.toContain(validKey);
    });

    it('does not persist API keys without secure storage', async () => {
      Reflect.set(SecureApiKeyManager, 'instance', undefined);
      Object.defineProperty(window, 'electron', {
        configurable: true,
        value: undefined,
      });

      const browserManager = SecureApiKeyManager.getInstance();
      const validKey = 'sk-' + 'a'.repeat(48);
      const stored = await browserManager.storeApiKey('OPENAI', validKey);

      expect(stored).toBe(false);
      const storedData = localStorage.getItem('secure_api_key_openai');
      expect(storedData).toBeNull();
    });

    it('returns null for non-existent keys', async () => {
      const retrieved = await manager.getApiKey('NONEXISTENT');
      expect(retrieved).toBeNull();
    });
  });

  describe('removeApiKey', () => {
    it('removes stored API keys', async () => {
      const validKey = 'sk-' + 'a'.repeat(48);

      await manager.storeApiKey('OPENAI', validKey);
      expect(await manager.getApiKey('OPENAI')).toBe(validKey);

      await manager.removeApiKey('OPENAI');
      expect(await manager.getApiKey('OPENAI')).toBeNull();
    });
  });

  describe('getStoredProviders', () => {
    it('lists stored API key providers', async () => {
      const openaiKey = 'sk-' + 'a'.repeat(48);
      const deepseekKey = 'sk-' + 'b'.repeat(32);

      await manager.storeApiKey('OPENAI', openaiKey);
      await manager.storeApiKey('DEEPSEEK', deepseekKey);

      const providers = await manager.getStoredProviders();

      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.provider)).toContain('openai');
      expect(providers.map((p) => p.provider)).toContain('deepseek');
    });
  });

  describe('testApiKey', () => {
    it('tests DeepSeek API key', async () => {
      const validKey = 'sk-' + 'a'.repeat(32);

      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const result = await manager.testApiKey('DEEPSEEK', validKey);

      expect(result).toBe(true);
    });

    it('returns false for invalid API key', async () => {
      const validKey = 'sk-' + 'a'.repeat(48);

      (global.fetch as any).mockResolvedValueOnce({ ok: false });

      const result = await manager.testApiKey('OPENAI', validKey);

      expect(result).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      const validKey = 'sk-' + 'a'.repeat(48);

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await manager.testApiKey('OPENAI', validKey);

      expect(result).toBe(false);
    });
  });

  describe('resetKeyVault', () => {
    it('clears all stored keys', async () => {
      const openaiKey = 'sk-' + 'a'.repeat(48);
      const deepseekKey = 'sk-' + 'b'.repeat(32);

      await manager.storeApiKey('OPENAI', openaiKey);
      await manager.storeApiKey('DEEPSEEK', deepseekKey);

      const reset = await manager.resetKeyVault();

      expect(reset).toBe(true);
      expect(await manager.getApiKey('OPENAI')).toBeNull();
      expect(await manager.getApiKey('DEEPSEEK')).toBeNull();
    });
  });
});
