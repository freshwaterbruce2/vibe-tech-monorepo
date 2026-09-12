import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PRODUCTION_URL = 'https://vibe-tutor-api-734857480460.us-east4.run.app';

// Helper to create full Location object from partial
const createLocation = (partial: Partial<Location> = {}): Location =>
  ({
    protocol: 'http:',
    hostname: 'localhost',
    pathname: '/',
    search: '',
    hash: '',
    host: 'localhost',
    href: 'http://localhost/',
    origin: 'http://localhost',
    port: '',
    ancestorOrigins: {} as DOMStringList,
    assign: vi.fn() as Location['assign'],
    reload: vi.fn() as Location['reload'],
    replace: vi.fn() as Location['replace'],
    toString: () => 'http://localhost/',
    ...partial,
  }) as Location;

// Mock window object for different environments
const mockWindow = (overrides?: { location?: Partial<Location>; [key: string]: unknown }) => {
  (global as unknown as Record<string, unknown>).window = {
    location: createLocation(overrides?.location),
    ...overrides,
  };
};

const clearWindow = () => {
  delete (global as unknown as Record<string, unknown>).window;
};

describe('config.ts', () => {
  // Clear module cache and window before each test
  beforeEach(() => {
    vi.resetModules();
    clearWindow();
    // Keep tests deterministic even if shell/.env has USB debug enabled.
    vi.stubEnv('VITE_USB_DEBUG', 'false');
    // Clear console logs to avoid test pollution
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('environment detection', () => {
    it('should detect localhost as development', async () => {
      mockWindow({
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
    });

    it('should detect 127.0.0.1 as development', async () => {
      mockWindow({
        location: {
          protocol: 'http:',
          hostname: '127.0.0.1',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
    });

    it('should detect production environment', async () => {
      mockWindow({
        location: {
          protocol: 'https:',
          hostname: 'vibetutor.app',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('should detect Capacitor by protocol', async () => {
      mockWindow({
        location: {
          protocol: 'capacitor:',
          hostname: '',
        },
      });

      const config = await import('./config');
      // Capacitor release builds should use production backend by default
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('should detect Capacitor by ionic protocol', async () => {
      mockWindow({
        location: {
          protocol: 'ionic:',
          hostname: '',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('should detect Capacitor by global object', async () => {
      mockWindow({
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
        Capacitor: {},
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
    });
  });

  describe('Node.js/SSR environment', () => {
    it('should handle Node.js environment (no window)', async () => {
      // Don't mock window - leave it undefined
      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
    });
  });

  describe('API_CONFIG structure', () => {
    beforeEach(() => {
      mockWindow();
    });

    it('should export baseURL', async () => {
      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBeDefined();
      expect(typeof config.API_CONFIG.baseURL).toBe('string');
    });

    it('should export all required endpoints', async () => {
      const config = await import('./config');

      expect(config.API_CONFIG.endpoints).toBeDefined();
      expect(config.API_CONFIG.endpoints.initSession).toBe('/api/session/init');
      expect(config.API_CONFIG.endpoints.chat).toBe('/api/chat');
      expect(config.API_CONFIG.endpoints.health).toBe('/api/health');
    });

    it('should export as default export', async () => {
      const config = await import('./config');
      expect(config.default).toBe(config.API_CONFIG);
    });
  });

  describe('URL constants', () => {
    it('should use correct production URL', async () => {
      mockWindow({
        location: {
          protocol: 'https:',
          hostname: 'vibetutor.app',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('should use USB debug URL for local development', async () => {
      mockWindow({
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
    });
  });

  describe('native Capacitor backend allowlist', () => {
    const nativeWindow = (apiUrl: string) =>
      mockWindow({
        location: { protocol: 'capacitor:', hostname: '' },
        Capacitor: { isNativePlatform: () => true },
        __API_URL__: apiUrl,
      });

    it('accepts the exact approved production HTTPS origin', async () => {
      nativeWindow(PRODUCTION_URL);
      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it.each([
      'https://evil.example/api',
      'https://evil-localhost.example/api',
      'http://api.example.test',
      'not a valid URL',
    ])('rejects unapproved native override %s', async (override) => {
      nativeWindow(override);
      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('allows localhost only with both DEV and the explicit native-local flag', async () => {
      vi.stubEnv('DEV', 'true');
      vi.stubEnv('VITE_ALLOW_NATIVE_LOCAL_API', 'true');
      nativeWindow('http://localhost:3001');
      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
    });

    it('allows localhost on native when VITE_USB_DEBUG is enabled in DEV mode', async () => {
      vi.stubEnv('DEV', 'true');
      vi.stubEnv('VITE_USB_DEBUG', 'true');
      nativeWindow('');
      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('http://localhost:3001');
      expect(config.isUsingLocalBackend).toBe(true);
    });
  });

  describe('dev bridge seams & notices', () => {
    it('returns null dev notice in non-dev builds', async () => {
      vi.stubEnv('DEV', 'false');
      mockWindow({
        location: { protocol: 'https:', hostname: 'vibetutor.app' },
        __DEV__: false,
      });
      const config = await import('./config');
      expect(config.isDevBuild).toBe(false);
      expect(config.getDevBridgeNotice()).toBeNull();
    });

    it('returns bridge connected notice when dev build connects to local backend', async () => {
      vi.stubEnv('DEV', 'true');
      mockWindow({
        location: { protocol: 'http:', hostname: 'localhost' },
      });
      const config = await import('./config');
      expect(config.isDevBuild).toBe(true);
      expect(config.isUsingLocalBackend).toBe(true);
      expect(config.getDevBridgeNotice()).toContain('connected to local dev bridge');
    });

    it('returns Cloud Run warning and bridge guidance on native debug build targeting production', async () => {
      vi.stubEnv('DEV', 'true');
      mockWindow({
        location: { protocol: 'capacitor:', hostname: '' },
        Capacitor: { isNativePlatform: () => true },
      });
      const config = await import('./config');
      expect(config.isDevBuild).toBe(true);
      expect(config.isUsingLocalBackend).toBe(false);
      expect(config.getDevBridgeNotice()).toContain('Play Integrity required');
      expect(config.getDevBridgeNotice()).toContain('pnpm run dev:bridge');
    });
  });

  describe('edge cases', () => {
    it('should handle missing location object', async () => {
      mockWindow({ location: undefined as unknown as Partial<Location> });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('should handle production Capacitor build', async () => {
      mockWindow({
        location: {
          protocol: 'capacitor:',
          hostname: '',
        },
        Capacitor: {},
      });

      const config = await import('./config');
      // Production Capacitor defaults to production backend unless VITE_USB_DEBUG=true
      expect(config.API_CONFIG.baseURL).toBe(PRODUCTION_URL);
    });

    it('should log environment detection info', async () => {
      const consoleSpy = vi.spyOn(console, 'debug');

      mockWindow({
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
      });

      await import('./config');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CONFIG] Environment detected:'),
        expect.any(Object),
      );
    });
  });

  describe('type safety', () => {
    it('should have correct TypeScript types', async () => {
      const config = await import('./config');
      expect(config).toBeDefined();

      // Type assertions to verify structure
      const apiConfig: typeof config.API_CONFIG = {
        baseURL: 'http://test',
        endpoints: {
          initSession: '/api/session/init',
          chat: '/api/chat',
          health: '/api/health',
        },
      };

      expect(apiConfig).toBeDefined();
    });
  });
});
