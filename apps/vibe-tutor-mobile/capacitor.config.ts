import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibetech.vibetutor.mobile',
  appName: 'Vibe Tutor',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#101828',
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    appendUserAgent: 'VibeTutorMobile/1.6.0',
  },
};

export default config;
