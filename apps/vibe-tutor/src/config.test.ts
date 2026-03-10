import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    assign: vi.fn() as any,
    reload: vi.fn() as any,
    replace: vi.fn() as any,
    toString: () => 'http://localhost/',
    ...partial,
  }) as Location;

// Mock window object for different environments
const mockWindow = (overrides?: { location?: Partial<Location>; [key: string]: any }) => {
  (global as any).window = {
    location: createLocation(overrides?.location),
    ...overrides,
  };
};

const clearWindow = () => {
  delete (global as any).window;
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
      expect(config.API_CONFIG.baseURL).toBe('https://vibe-tutor-api.onrender.com');
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
      expect(config.API_CONFIG.baseURL).toBe('https://vibe-tutor-api.onrender.com');
    });

    it('should detect Capacitor by ionic protocol', async () => {
      mockWindow({
        location: {
          protocol: 'ionic:',
          hostname: '',
        },
      });

      const config = await import('./config');
      expect(config.API_CONFIG.baseURL).toBe('https://vibe-tutor-api.onrender.com');
    });

    it('should detect Capacitor by global object', async () => {
      mockWindow({
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
        Capacitor: {} as any,
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
      expect(config.API_CONFIG.endpoints.openrouterChat).toBe('/api/chat');
      expect(config.API_CONFIG.endpoints.health).toBe('/api/health');
      expect(config.API_CONFIG.endpoints.logAnalytics).toBe('/api/analytics/log');
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
      expect(config.API_CONFIG.baseURL).toBe('https://vibe-tutor-api.onrender.com');
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

  describe('edge cases', () => {
    it('should handle missing location object', async () => {
      mockWindow({ location: undefined as any });

      // KNOWN ISSUE: config.ts doesn't gracefully handle undefined location
      // This would crash in real scenario, but we test the actual behavior
      await expect(async () => {
        await import('./config');
      }).rejects.toThrow();
    });

    it('should handle production Capacitor build', async () => {
      mockWindow({
        location: {
          protocol: 'capacitor:',
          hostname: '',
        },
        Capacitor: {} as any,
      });

      const config = await import('./config');
      // Production Capacitor defaults to production backend unless VITE_USB_DEBUG=true
      expect(config.API_CONFIG.baseURL).toBe('https://vibe-tutor-api.onrender.com');
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
          openrouterChat: '/api/chat',
          health: '/api/health',
          logAnalytics: '/api/analytics/log',
        },
      };

      expect(apiConfig).toBeDefined();
    });
  });
});
