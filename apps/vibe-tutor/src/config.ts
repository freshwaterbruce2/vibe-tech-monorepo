import { Capacitor } from '@capacitor/core';
import { logger } from './utils/logger';

// Vibe-Tutor Configuration
export * from './config/blakeConfig';

// Runtime detection
const browserLocation = typeof window !== 'undefined' ? window.location : undefined;
const isDevelopment =
  browserLocation?.hostname === 'localhost' || browserLocation?.hostname === '127.0.0.1';

// Detect native Capacitor runtime (Android/iOS).
// Do NOT rely only on `Capacitor in window` because Electron/web shims may define it.
const isNativeCapacitor =
  typeof window !== 'undefined' &&
  (browserLocation?.protocol === 'capacitor:' ||
    browserLocation?.protocol === 'ionic:' ||
    (typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform()) ||
    (typeof (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform === 'function' &&
      Boolean(
        (
          window as { Capacitor?: { isNativePlatform?: () => boolean } }
        ).Capacitor?.isNativePlatform?.(),
      )));

// ============== URL CONFIGURATION ==============
// Production: Google Cloud Run
const PRODUCTION_BACKEND_URL = 'https://vibe-tutor-api-734857480460.us-east4.run.app';
const allowNativeLocalApi = import.meta.env.VITE_ALLOW_NATIVE_LOCAL_API === 'true';

// Dev / Debug mode detection across web, electron, and native debug APK
const windowDev =
  typeof window !== 'undefined'
    ? (window as Window & { __DEV__?: boolean; __DEBUGGABLE__?: boolean }).__DEV__
    : undefined;
const windowDebuggable =
  typeof window !== 'undefined'
    ? (window as Window & { __DEV__?: boolean; __DEBUGGABLE__?: boolean }).__DEBUGGABLE__
    : undefined;

export const isDevBuild = Boolean(
  windowDev !== undefined
    ? windowDev
    : (import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true' || windowDebuggable),
);

const allowNativeDevLocalApi = (isDevBuild || import.meta.env.DEV) && (allowNativeLocalApi || import.meta.env.VITE_USB_DEBUG === 'true');
const runtimeApiUrl =
  typeof window !== 'undefined'
    ? (window as Window & { __API_URL__?: string }).__API_URL__
    : undefined;

// Local development backend, guarded out of native production by the checks below.
const USB_DEBUG_URL = 'http://localhost:3001';

// Guard local overrides with DEV so production builds cannot accidentally use localhost.
const USE_USB_DEBUG =
  (isDevBuild || import.meta.env.DEV) && import.meta.env.VITE_USB_DEBUG === 'true';

/**
 * Detect the best backend URL based on environment
 */
function detectBackendURL(): string {
  if (typeof runtimeApiUrl === 'string' && runtimeApiUrl.trim().length > 0) {
    const trimmedRuntimeUrl = runtimeApiUrl.trim();
    let isLocalRuntimeUrl = false;
    try {
      const host = new URL(trimmedRuntimeUrl).hostname;
      isLocalRuntimeUrl = host === 'localhost' || host === '127.0.0.1';
    } catch {
      isLocalRuntimeUrl = false;
    }
    if (isNativeCapacitor) {
      if (trimmedRuntimeUrl === PRODUCTION_BACKEND_URL) return PRODUCTION_BACKEND_URL;
      if (isLocalRuntimeUrl && allowNativeDevLocalApi) return trimmedRuntimeUrl;
      return PRODUCTION_BACKEND_URL;
    }
    return trimmedRuntimeUrl;
  }

  // Node.js/SSR environment
  if (typeof window === 'undefined') {
    return USB_DEBUG_URL;
  }

  if (!browserLocation) {
    return PRODUCTION_BACKEND_URL;
  }

  // Explicit USB debug override (for local development or dev bridge testing)
  if (USE_USB_DEBUG && (!isNativeCapacitor || allowNativeDevLocalApi)) {
    return USB_DEBUG_URL;
  }

  // Local browser/electron development — always use local backend.
  // Native Capacitor release builds also run at localhost, so exclude those.
  if (isDevelopment && !isNativeCapacitor) {
    return USB_DEBUG_URL;
  }

  // Capacitor (production APK) + web production → Cloud Run
  return PRODUCTION_BACKEND_URL;
}

export const API_CONFIG = {
  baseURL: detectBackendURL(),

  endpoints: {
    initSession: '/api/session/init',
    chat: '/api/chat',
    health: '/api/health',
  },
};

export const isUsingLocalBackend = Boolean(
  API_CONFIG.baseURL.includes('localhost') || API_CONFIG.baseURL.includes('127.0.0.1'),
);

export { isNativeCapacitor };

/**
 * Returns diagnostic notice text when running a debug build.
 * Informs developers whether the app is pointing to local bridge or Cloud Run.
 */
export function getDevBridgeNotice(): string | null {
  if (!isDevBuild) return null;
  if (isUsingLocalBackend) {
    return 'Debug build: connected to local dev bridge (localhost:3001)';
  }
  if (isNativeCapacitor) {
    return 'Debug build targeting Cloud Run (Play Integrity required). For local bridge, run: pnpm run dev:bridge';
  }
  return null;
}

// ============== DEBUG LOGGING ==============

if (typeof window !== 'undefined') {
  logger.debug('[CONFIG] Environment detected:', {
    isDevelopment,
    isNativeCapacitor,
    protocol: browserLocation?.protocol,
    hostname: browserLocation?.hostname,
    hasCapacitorGlobal: 'Capacitor' in window,
    baseURL: API_CONFIG.baseURL,
  });
} else {
  logger.debug('[CONFIG] Node.js environment:', {
    baseURL: API_CONFIG.baseURL,
  });
}

export default API_CONFIG;
