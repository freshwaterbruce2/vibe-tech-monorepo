import { Capacitor } from '@capacitor/core';
import { logger } from './utils/logger';

// Vibe-Tutor Configuration
// UPDATED: January 10, 2026 - Fixed for USB debugging with ADB reverse
export * from './config/blakeConfig';

// Runtime detection
const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Detect native Capacitor runtime (Android/iOS).
// Do NOT rely only on `Capacitor in window` because Electron/web shims may define it.
const isNativeCapacitor =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
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
const PRODUCTION_BACKEND_URL = 'https://vibe-tutor-api-711105902979.us-east4.run.app';
const allowNativeLocalApi = import.meta.env.VITE_ALLOW_NATIVE_LOCAL_API === 'true';
const runtimeApiUrl =
  typeof window !== 'undefined'
    ? (window as Window & { __API_URL__?: string }).__API_URL__
    : undefined;

// USB debugging with ADB reverse (for local development ONLY)
// Run: adb reverse tcp:3001 tcp:3001
const USB_DEBUG_URL = 'http://localhost:3001';

// Set VITE_USB_DEBUG=true in .env.local for local Capacitor development.
// Guard with DEV so production builds cannot accidentally hardcode localhost.
const USE_USB_DEBUG =
  import.meta.env.DEV && import.meta.env.VITE_USB_DEBUG === 'true' && !isNativeCapacitor;

/**
 * Detect the best backend URL based on environment
 */
function detectBackendURL(): string {
  if (typeof runtimeApiUrl === 'string' && runtimeApiUrl.trim().length > 0) {
    const trimmedRuntimeUrl = runtimeApiUrl.trim();
    const isLocalRuntimeUrl =
      trimmedRuntimeUrl.includes('localhost') || trimmedRuntimeUrl.includes('127.0.0.1');
    if (isNativeCapacitor && isLocalRuntimeUrl && !allowNativeLocalApi) {
      return PRODUCTION_BACKEND_URL;
    }
    return trimmedRuntimeUrl;
  }

  // Node.js/SSR environment
  if (typeof window === 'undefined') {
    return USB_DEBUG_URL;
  }

  // Explicit USB debug override (for local development)
  if (USE_USB_DEBUG) {
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
    openrouterChat: '/api/chat',
    health: '/api/health',
    logAnalytics: '/api/analytics/log',
  },
};

// ============== DEBUG LOGGING ==============

if (typeof window !== 'undefined') {
  logger.debug('[CONFIG] Environment detected:', {
    isDevelopment,
    isNativeCapacitor,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    hasCapacitorGlobal: 'Capacitor' in window,
    baseURL: API_CONFIG.baseURL,
  });
} else {
  logger.debug('[CONFIG] Node.js environment:', {
    baseURL: API_CONFIG.baseURL,
  });
}

export default API_CONFIG;

// ============== SETUP INSTRUCTIONS ==============
/*
USB DEBUGGING SETUP (Recommended):

1. Connect Android phone via USB
2. Enable USB debugging on phone (Settings > Developer Options)
3. Open PowerShell on PC and run:

   adb reverse tcp:3001 tcp:3001

4. Start backend server:

   cd C:\dev\apps\vibe-tutor\render-backend
   node server.mjs

5. Now the Android app can reach your PC's localhost:3001

WIFI DEBUGGING ALTERNATIVE:

1. Ensure phone and PC are on same WiFi network
2. Find your PC's IP: ipconfig | findstr IPv4
3. Update USB_DEBUG_URL to: http://YOUR_IP:3001
4. Make sure Windows Firewall allows port 3001
*/
