// Configuration for NOVA Mobile App

// Platform-aware API URL detection
// - iOS Simulator: 'localhost' works directly
// - Android Emulator: '10.0.2.2' is the special alias for host machine
// - Physical device: Use your computer's LAN IP, or `adb reverse tcp:3000 tcp:3000`
function getDefaultApiHost(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_OVERRIDE_API_URL;
  if (envUrl) return envUrl;

  if (!__DEV__) return 'https://api.nova-ai.com';

  // On-device testing via adb reverse tcp:5005 tcp:5005 maps localhost:5005 to the host's 5005 gateway.
  // Android emulator can also use 10.0.2.2:5005 if adb reverse is not active, but localhost is preferred for adb reverse.
  return 'http://localhost:5005';
}

export const config = {
  // API URLs
  API_URL: getDefaultApiHost(),
  WS_URL: __DEV__ ? 'ws://localhost:5005' : 'wss://api.nova-ai.com',

  // Authentication
  // ⚠️ WARNING: Set EXPO_PUBLIC_BRIDGE_TOKEN in your .env — the fallback is for dev only.
  // Production builds will throw if the env var is missing.
  BRIDGE_TOKEN: (() => {
    const token = process.env.EXPO_PUBLIC_BRIDGE_TOKEN;
    if (!token && !__DEV__) {
      throw new Error('EXPO_PUBLIC_BRIDGE_TOKEN is required in production builds');
    }
    return token || 'nova_default_secret_token_change_me';
  })(),

  // Timeouts
  API_TIMEOUT: 30_000,
  HEALTH_CHECK_INTERVAL: 15_000,

  // Debug
  DEBUG: __DEV__,

  // App metadata
  APP_NAME: 'NOVA AI Assistant',
  APP_VERSION: '1.0.0',

  // Feature flags
  FEATURES: {
    VOICE_INPUT: true,
    OFFLINE_MODE: true,
    BIOMETRIC_AUTH: true,
    PUSH_NOTIFICATIONS: true,
    MEMORY_SEARCH: true,
  },

  // Theme — Vibe Tech palette
  THEME: {
    // Core
    BACKGROUND: '#0a0a0f',
    SURFACE: '#111118',
    SURFACE_ELEVATED: '#1a1a24',
    BORDER: '#2a2a3a',

    // Text
    TEXT_PRIMARY: '#f0f0f5',
    TEXT_SECONDARY: '#8888a0',
    TEXT_MUTED: '#555570',

    // Accents
    ACCENT_CYAN: '#00d4ff',
    ACCENT_MAGENTA: '#ff006e',
    ACCENT_GREEN: '#00ff88',
    ACCENT_AMBER: '#ffaa00',

    // Status
    STATUS_ONLINE: '#00ff88',
    STATUS_OFFLINE: '#ff4444',
    STATUS_BUSY: '#ffaa00',
    STATUS_ERROR: '#ff006e',
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${config.API_URL}${endpoint}`;
};

export type AppConfig = typeof config;
