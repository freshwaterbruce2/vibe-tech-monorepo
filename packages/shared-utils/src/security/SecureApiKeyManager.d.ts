interface Logger {
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}
interface ApiKeyMetadata {
    provider: string;
    isValid: boolean;
    lastValidated: Date;
    encrypted: boolean;
}
export declare class SecureApiKeyManager {
    private static instance;
    private encryptionKey;
    private storage;
    private electronStorage;
    private isElectron;
    private logger;
    private readonly encryptionKeyName;
    private constructor();
    static getInstance(logger?: Logger): SecureApiKeyManager;
    /**
     * Validate API key format and structure
     */
    validateApiKey(key: string, provider: string): boolean;
    /**
     * Encrypt API key before storage
     */
    encryptApiKey(key: string): string;
    /**
     * Decrypt API key from storage (uses current encryption key)
     */
    decryptApiKey(encryptedKey: string): string;
    /**
     * Store API key securely
     */
    storeApiKey(provider: string, key: string): Promise<boolean>;
    /**
     * Retrieve and decrypt API key.
     *
     * This method is intentionally defensive:
     * - It safely handles corrupt JSON in either storage backend.
     * - It can recover from encryption-key drift between localStorage and Electron storage by
     *   attempting decryption with the Electron-stored `app_encryption_key`.
     */
    getApiKey(provider: string): Promise<string | null>;
    /**
     * Remove API key from storage
     */
    removeApiKey(provider: string): Promise<boolean>;
    /**
     * List stored API key providers (without exposing keys)
     *
     * In Electron, this avoids returning providers whose stored payload can't be parsed/decrypted,
     * which prevents noisy auto-initialize loops on app startup.
     */
    getStoredProviders(): Promise<{
        provider: string;
        metadata: ApiKeyMetadata;
    }[]>;
    /**
     * Test API key by making a validation request
     */
    testApiKey(provider: string, key?: string): Promise<boolean>;
    /**
     * Clears encryption key + all stored encrypted keys. Use as a last resort when storage is corrupt.
     */
    resetKeyVault(): Promise<boolean>;
    private decryptApiKeyWithKey;
    private tryDecryptApiKeyWithKey;
    private parseStoredApiKey;
    private getStoredDataCandidates;
    private getElectronEncryptionKey;
    private adoptEncryptionKey;
    private forceRemoveStorageKey;
    private getOrCreateEncryptionKey;
    private containsSuspiciousPatterns;
    private updateEnvironmentVariable;
    private getEnvironmentVariable;
    private clearEnvironmentVariable;
    private testDeepSeekKey;
    private testOpenAIKey;
    private testAnthropicKey;
    private testGoogleKey;
    private testGitHubKey;
    private testGroqKey;
    private testHuggingFaceKey;
}
export default SecureApiKeyManager;
//# sourceMappingURL=SecureApiKeyManager.d.ts.map