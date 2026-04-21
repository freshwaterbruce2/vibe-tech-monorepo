/**
 * Secure API Key Manager
 * Provides validation, encryption, and secure storage for API keys
 *
 * Shared utility for Vibetech monorepo projects
 */
import * as CryptoJS from 'crypto-js';

// Simple logger interface - projects can override with their own
interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// Default console-based logger
const defaultLogger: Logger = {
  info: () => undefined,
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
};

// API key validation patterns
const API_KEY_PATTERNS = {
  DEEPSEEK: /^sk-[a-f0-9]{32,}$/i,
  OPENAI: /^sk-[a-zA-Z0-9]{48,}$/,
  OPENROUTER: /^sk-or-[a-zA-Z0-9\-_]{20,}$/,
  MOONSHOT: /^sk-[a-zA-Z0-9]{20,}$/,
  ANTHROPIC: /^sk-ant-[a-zA-Z0-9\-_]{95,}$/,
  GOOGLE: /^AIza[a-zA-Z0-9\-_]{35}$/,
  GITHUB: /^ghp_[a-zA-Z0-9]{36}$|^github_pat_[a-zA-Z0-9_]{82}$/,
  GROQ: /^gsk_[a-zA-Z0-9]{20,}$/,
  HUGGINGFACE: /^hf_[a-zA-Z0-9]{20,}$/,
};

interface ApiKeyMetadata {
  provider: string;
  isValid: boolean;
  lastValidated: Date;
  encrypted: boolean;
}

interface StoredApiKey {
  key: string;
  metadata: ApiKeyMetadata;
}

interface ElectronStorageAPI {
  get: (key: string) => Promise<{ success: boolean; value: unknown }>;
  set: (key: string, value: unknown) => Promise<{ success: boolean }>;
  remove: (key: string) => Promise<{ success: boolean }>;
  keys: () => Promise<{ success: boolean; keys: string[] }>;
}

interface ElectronRendererAPI {
  setTempEnvVar: (name: string, value: string) => void;
  clearTempEnvVar: (name: string) => void;
}

interface RendererWindow {
  electron?: {
    storage?: ElectronStorageAPI;
  };
  electronAPI?: ElectronRendererAPI;
}

export class SecureApiKeyManager {
  private static instance: SecureApiKeyManager;

  private encryptionKey: string;
  private storage: Storage;
  private electronStorage: ElectronStorageAPI | null = null;
  private isElectron = false;
  private logger: Logger;

  private readonly encryptionKeyName = 'app_encryption_key';

  private constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;

    if (typeof window === 'undefined') {
      throw new Error('SecureApiKeyManager requires a browser/Electron renderer environment');
    }

    const rendererWindow = this.getRendererWindow();

    // Check if running in Electron (renderer)
    if (rendererWindow.electron?.storage) {
      this.isElectron = true;
      this.electronStorage = rendererWindow.electron.storage;
      this.logger.info('Using Electron storage for API keys');
    } else {
      this.logger.info('Using localStorage for API keys (browser mode)');
    }

    this.storage = window.localStorage;
    // Note: this is sync; reconciliation with Electron storage is handled in getApiKey() if needed.
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  public static getInstance(logger?: Logger): SecureApiKeyManager {
    if (!SecureApiKeyManager.instance) {
      SecureApiKeyManager.instance = new SecureApiKeyManager(logger);
    }
    return SecureApiKeyManager.instance;
  }

  /**
   * Validate API key format and structure
   */
  public validateApiKey(key: string, provider: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const cleanKey = key.trim();

    if (cleanKey.length < 20) {
      return false;
    }

    if (this.containsSuspiciousPatterns(cleanKey)) {
      return false;
    }

    const pattern = API_KEY_PATTERNS[provider.toUpperCase() as keyof typeof API_KEY_PATTERNS];
    if (pattern && !pattern.test(cleanKey)) {
      return false;
    }

    return true;
  }

  /**
   * Encrypt API key before storage
   */
  public encryptApiKey(key: string): string {
    try {
      return CryptoJS.AES.encrypt(key, this.encryptionKey).toString();
    } catch (error) {
      this.logger.error('Failed to encrypt API key:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt API key from storage (uses current encryption key)
   */
  public decryptApiKey(encryptedKey: string): string {
    try {
      return this.decryptApiKeyWithKey(encryptedKey, this.encryptionKey);
    } catch (error) {
      this.logger.error('Failed to decrypt API key:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Store API key securely
   */
  public async storeApiKey(provider: string, key: string): Promise<boolean> {
    try {
      if (!this.validateApiKey(key, provider)) {
        throw new Error(`Invalid ${provider} API key format`);
      }

      let finalKey = key;
      let isEncrypted = false;

      // Try to encrypt, fall back to plain storage if CryptoJS fails
      try {
        finalKey = this.encryptApiKey(key);
        isEncrypted = true;
      } catch (encryptError) {
        this.logger.warn('[SecureApiKeyManager] Encryption failed, storing key directly:', encryptError);
        finalKey = key;
        isEncrypted = false;
      }

      const metadata: ApiKeyMetadata = {
        provider: provider.toLowerCase(),
        isValid: true,
        lastValidated: new Date(),
        encrypted: isEncrypted,
      };

      const storedKey: StoredApiKey = {
        key: finalKey,
        metadata,
      };

      const storageKey = `secure_api_key_${provider.toLowerCase()}`;

      // Use Electron storage if available
      if (this.isElectron && this.electronStorage) {
        try {
          const result = await this.electronStorage.set(storageKey, JSON.stringify(storedKey));
          if (!result.success) {
            this.logger.warn('[SecureApiKeyManager] Electron storage failed, using localStorage');
          }
        } catch (electronErr) {
          this.logger.warn('[SecureApiKeyManager] Electron storage error:', electronErr);
        }
      }

      // Always also save to localStorage as a fallback for immediate use
      this.storage.setItem(storageKey, JSON.stringify(storedKey));

      // Also update environment variable for immediate use
      this.updateEnvironmentVariable(provider, key);

      this.logger.info(`[SecureApiKeyManager] API key saved for ${provider} (encrypted: ${isEncrypted})`);
      return true;
    } catch (error) {
      this.logger.error('Failed to store API key:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt API key.
   *
   * This method is intentionally defensive:
   * - It safely handles corrupt JSON in either storage backend.
   * - It can recover from encryption-key drift between localStorage and Electron storage by
   *   attempting decryption with the Electron-stored `app_encryption_key`.
   */
  public async getApiKey(provider: string): Promise<string | null> {
    const normalizedProvider = provider.toLowerCase();
    const storageKey = `secure_api_key_${normalizedProvider}`;

    try {
      const candidates = await this.getStoredDataCandidates(storageKey);
      const storedData = candidates.local ?? candidates.electron;
      if (!storedData) {
        return this.getEnvironmentVariable(provider);
      }

      const parsed = this.parseStoredApiKey(storedData);
      if (!parsed) {
        this.logger.warn(`Stored API key for '${normalizedProvider}' is malformed, removing...`);
        await this.forceRemoveStorageKey(storageKey);
        this.clearEnvironmentVariable(provider);
        return null;
      }

      if (!parsed.metadata?.encrypted) {
        // Key stored without encryption (CryptoJS fallback) - return as-is
        this.logger.info(`API key for '${normalizedProvider}' stored without encryption, returning directly`);
        return parsed.key;
      }

      let decryptedKey = this.tryDecryptApiKeyWithKey(parsed.key, this.encryptionKey);

      // Recover from encryption-key drift between localStorage and Electron storage.
      if (!decryptedKey && this.isElectron && this.electronStorage) {
        const electronKey = await this.getElectronEncryptionKey();
        if (electronKey && electronKey !== this.encryptionKey) {
          const recovered = this.tryDecryptApiKeyWithKey(parsed.key, electronKey);
          if (recovered) {
            this.logger.warn(
              `Recovered encryption key from Electron storage; adopting it for '${normalizedProvider}'.`
            );
            this.adoptEncryptionKey(electronKey);
            decryptedKey = recovered;
          }
        }
      }

      if (!decryptedKey) {
        this.logger.warn(`Failed to decrypt API key for '${normalizedProvider}', removing...`);
        await this.removeApiKey(provider);
        return null;
      }

      if (!this.validateApiKey(decryptedKey, provider)) {
        this.logger.warn(`Stored API key for '${normalizedProvider}' is invalid, removing...`);
        await this.removeApiKey(provider);
        return null;
      }

      return decryptedKey;
    } catch (error) {
      this.logger.error('Failed to retrieve API key:', error);
      await this.removeApiKey(provider);
      return null;
    }
  }

  /**
   * Remove API key from storage
   */
  public async removeApiKey(provider: string): Promise<boolean> {
    const storageKey = `secure_api_key_${provider.toLowerCase()}`;
    let electronOk = true;

    try {
      if (this.isElectron && this.electronStorage) {
        const result = await this.electronStorage.remove(storageKey);
        if (!result.success) {
          electronOk = false;
          this.logger.warn(`Failed to remove '${storageKey}' from Electron storage`);
        }
      }
    } catch (error) {
      electronOk = false;
      this.logger.warn(`Failed to remove '${storageKey}' from Electron storage:`, error);
    }

    try {
      this.storage.removeItem(storageKey);
    } catch (error) {
      this.logger.warn(`Failed to remove '${storageKey}' from localStorage:`, error);
      return false;
    } finally {
      this.clearEnvironmentVariable(provider);
    }

    return electronOk;
  }

  /**
   * List stored API key providers (without exposing keys)
   *
   * In Electron, this avoids returning providers whose stored payload can't be parsed/decrypted,
   * which prevents noisy auto-initialize loops on app startup.
   */
  public async getStoredProviders(): Promise<{ provider: string; metadata: ApiKeyMetadata }[]> {
    const providers: { provider: string; metadata: ApiKeyMetadata }[] = [];

    try {
      let keys: string[] = [];

      if (this.isElectron && this.electronStorage) {
        const result = await this.electronStorage.keys();
        if (result.success && result.keys) {
          keys = result.keys;
        }
      }

      if (keys.length === 0) {
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key) {
            keys.push(key);
          }
        }
      }

      const electronKey =
        this.isElectron && this.electronStorage ? await this.getElectronEncryptionKey() : null;

      const providerEntries = await Promise.all(
        keys
          .filter((key): key is string => key.startsWith('secure_api_key_'))
          .map(async (key) => {
            const provider = key.replace('secure_api_key_', '');
            const candidates = await this.getStoredDataCandidates(key);
            const storedData = candidates.local ?? candidates.electron;
            if (!storedData) {
              return null;
            }

            const parsed = this.parseStoredApiKey(storedData);
            if (!parsed?.metadata?.encrypted) {
              await this.forceRemoveStorageKey(key);
              return null;
            }

            // Verify decryptability without returning the plaintext key.
            let canDecrypt = !!this.tryDecryptApiKeyWithKey(parsed.key, this.encryptionKey);
            if (!canDecrypt && electronKey) {
              canDecrypt = !!this.tryDecryptApiKeyWithKey(parsed.key, electronKey);
            }

            if (!canDecrypt) {
              this.logger.warn(`Stored API key for '${provider}' can't be decrypted, removing...`);
              await this.removeApiKey(provider);
              return null;
            }

            return {
              provider,
              metadata: parsed.metadata,
            };
          })
      );

      providers.push(
        ...providerEntries.filter(
          (
            providerEntry
          ): providerEntry is { provider: string; metadata: ApiKeyMetadata } =>
            providerEntry !== null
        )
      );
    } catch (error) {
      this.logger.error('Failed to list providers:', error);
    }

    return providers;
  }

  /**
   * Test API key by making a validation request
   */
  public async testApiKey(provider: string, key?: string): Promise<boolean> {
    const apiKey = key ?? (await this.getApiKey(provider));
    if (!apiKey) {
      return false;
    }

    try {
      switch (provider.toLowerCase()) {
        case 'deepseek':
          return await this.testDeepSeekKey(apiKey);
        case 'openai':
          return await this.testOpenAIKey(apiKey);
        case 'anthropic':
          return await this.testAnthropicKey(apiKey);
        case 'google':
          return await this.testGoogleKey(apiKey);
        case 'github':
          return await this.testGitHubKey(apiKey);
        case 'groq':
          return await this.testGroqKey(apiKey);
        case 'huggingface':
          return await this.testHuggingFaceKey(apiKey);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to test ${provider} API key:`, error);
      return false;
    }
  }

  /**
   * Clears encryption key + all stored encrypted keys. Use as a last resort when storage is corrupt.
   */
  public async resetKeyVault(): Promise<boolean> {
    try {
      const keysToRemove: string[] = [];

      if (this.isElectron && this.electronStorage) {
        const result = await this.electronStorage.keys();
        if (result.success && result.keys) {
          keysToRemove.push(...result.keys.filter(k => k === this.encryptionKeyName || k.startsWith('secure_api_key_')));
        }
      }

      // localStorage keys (best-effort)
      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i);
        if (k && (k === this.encryptionKeyName || k.startsWith('secure_api_key_'))) {
          keysToRemove.push(k);
        }
      }

      const uniqueKeys = Array.from(new Set(keysToRemove));
      await Promise.all(uniqueKeys.map(async (key) => this.forceRemoveStorageKey(key)));

      this.storage.removeItem(this.encryptionKeyName);
      this.encryptionKey = this.getOrCreateEncryptionKey();
      return true;
    } catch (error) {
      this.logger.error('Failed to reset key vault:', error);
      return false;
    }
  }

  private decryptApiKeyWithKey(encryptedKey: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Invalid encryption key or corrupted data');
    }
    return decrypted;
  }

  private tryDecryptApiKeyWithKey(encryptedKey: string, key: string): string | null {
    try {
      return this.decryptApiKeyWithKey(encryptedKey, key);
    } catch {
      return null;
    }
  }

  private parseStoredApiKey(storedData: unknown): StoredApiKey | null {
    try {
      const parsed =
        typeof storedData === 'string'
          ? (JSON.parse(storedData) as unknown)
          : storedData;
      if (!parsed || typeof parsed !== 'object') return null;

      const parsedRecord = parsed as Record<string, unknown>;
      if (typeof parsedRecord.key !== 'string') return null;
      if (!parsedRecord.metadata || typeof parsedRecord.metadata !== 'object') return null;

      const metadata = parsedRecord.metadata as Record<string, unknown>;
      if (typeof metadata.provider !== 'string') return null;
      if (typeof metadata.encrypted !== 'boolean') return null;

      return {
        key: parsedRecord.key,
        metadata: {
          provider: metadata.provider,
          isValid: metadata.isValid === true,
          lastValidated:
            metadata.lastValidated instanceof Date
              ? metadata.lastValidated
              : new Date(String(metadata.lastValidated ?? Date.now())),
          encrypted: metadata.encrypted,
        },
      };
    } catch {
      return null;
    }
  }

  private getRendererWindow(): RendererWindow {
    return window as unknown as RendererWindow;
  }

  private async getStoredDataCandidates(
    storageKey: string
  ): Promise<{ electron: unknown | null; local: unknown | null }> {
    let electron: unknown | null = null;
    let local: unknown | null = null;

    if (this.isElectron && this.electronStorage) {
      try {
        const result = await this.electronStorage.get(storageKey);
        if (result.success && result.value) {
          electron = result.value;
        }
      } catch {
        // ignore
      }
    }

    try {
      local = this.storage.getItem(storageKey);
    } catch {
      local = null;
    }

    return { electron, local };
  }

  private async getElectronEncryptionKey(): Promise<string | null> {
    if (!this.isElectron || !this.electronStorage) return null;
    try {
      const result = await this.electronStorage.get(this.encryptionKeyName);
      if (result.success && typeof result.value === 'string' && result.value.trim().length > 0) {
        return result.value;
      }
      return null;
    } catch {
      return null;
    }
  }

  private adoptEncryptionKey(key: string): void {
    this.encryptionKey = key;
    try {
      this.storage.setItem(this.encryptionKeyName, key);
    } catch {
      // ignore
    }

    if (this.isElectron && this.electronStorage) {
      this.electronStorage.set(this.encryptionKeyName, key).catch(err =>
        this.logger.warn('Failed to persist encryption key back to Electron storage:', err)
      );
    }
  }

  private async forceRemoveStorageKey(key: string): Promise<void> {
    if (this.isElectron && this.electronStorage) {
      try {
        await this.electronStorage.remove(key);
      } catch {
        // ignore
      }
    }

    try {
      this.storage.removeItem(key);
    } catch {
      // ignore
    }
  }

  private getOrCreateEncryptionKey(): string {
    let key = this.storage.getItem(this.encryptionKeyName);

    if (!key) {
      key = CryptoJS.lib.WordArray.random(256 / 8).toString();
      this.storage.setItem(this.encryptionKeyName, key);

      if (this.isElectron && this.electronStorage) {
        this.electronStorage.set(this.encryptionKeyName, key).catch(err =>
          this.logger.error('Failed to save encryption key to Electron storage:', err)
        );
      }
    }

    return key;
  }

  private containsSuspiciousPatterns(key: string): boolean {
    const suspiciousPatterns = [
      /javascript:/i,
      /<script/i,
      /eval\(/i,
      /function\s*\(/i,
      /\bexec\b/i,
      /\bsystem\b/i,
      /\.\.\//,
      /[<>'"]/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(key));
  }

  private updateEnvironmentVariable(provider: string, key: string): void {
    const envVarName = `VITE_${provider.toUpperCase()}_API_KEY`;
    const rendererWindow = this.getRendererWindow();
    if (rendererWindow.electronAPI) {
      rendererWindow.electronAPI.setTempEnvVar(envVarName, key);
    }
  }

  private getEnvironmentVariable(provider: string): string | null {
    const envVarName = `VITE_${provider.toUpperCase()}_API_KEY`;
    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[envVarName] ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private clearEnvironmentVariable(provider: string): void {
    const envVarName = `VITE_${provider.toUpperCase()}_API_KEY`;
    const rendererWindow = this.getRendererWindow();
    if (rendererWindow.electronAPI) {
      rendererWindow.electronAPI.clearTempEnvVar(envVarName);
    }
  }

  private async testDeepSeekKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testOpenAIKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testAnthropicKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });
      return response.status !== 401;
    } catch {
      return false;
    }
  }

  private async testGoogleKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testGitHubKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testGroqKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testHuggingFaceKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default SecureApiKeyManager;
