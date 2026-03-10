import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Security: Only enable debugging in development
const isDevelopment = process.env.NODE_ENV === 'development';
const fallbackAppVersion = '0.0.0';

function getAppVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, 'package.json');
    const packageJsonRaw = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonRaw) as { version?: unknown };
    if (typeof packageJson.version === 'string' && packageJson.version.trim().length > 0) {
      return packageJson.version.trim();
    }
  } catch (error) {
    console.warn('Unable to read app version for Capacitor user agent:', error);
  }
  return fallbackAppVersion;
}

const appVersion = getAppVersion();

const config: CapacitorConfig = {
  appId: 'com.vibetech.tutor',
  appName: 'Vibe Tutor',
  webDir: 'dist',
  server: {
    androidScheme: 'https', // SECURITY: Use HTTPS scheme for Android
    cleartext: false, // SECURITY: Keep cleartext traffic disabled
  },
  plugins: {
    // CRITICAL FIX: Enable CapacitorHttp plugin to bypass CORS issues
    // This routes fetch/XMLHttpRequest through native code instead of WebView
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: false, // Disabled mixed content for security
    backgroundColor: '#0F0F23', // Match app background
    webContentsDebuggingEnabled: isDevelopment, // SECURITY: Only enabled in development
    appendUserAgent: `VibeTutor/${appVersion}`,
  },
};

export default config;
