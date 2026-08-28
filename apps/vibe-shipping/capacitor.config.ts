import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibetech.dc8980.shipping',
  appName: 'DC8980 Shipping',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false, // Disabled for production security
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none',
    hardwareAccelerated: true,
    allowDownloads: true,
    allowsRecordAudio: true,
    keepAlive: true,
    maxMemorySize: 512, // Increased for better performance
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'dc8980-shipping',
      releaseType: 'AAB', // Android App Bundle for Play Store
      signingType: 'apksigner'
    },
    minWebViewVersion: 89, // Modern WebView for PWA features
    useLegacyBridge: false,
    backgroundColor: '#0052CC' // Walmart blue
  },
  ios: {
    scheme: 'DC8980 Shipping',
    backgroundColor: '#0052CC',
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: false,
    handleApplicationURL: false,
    buildOptions: {
      developmentTeam: 'VIBETECH_TEAM_ID', // To be replaced with actual team ID
      packageType: 'app-store',
      buildConfiguration: 'Release'
    },
    minVersion: '13.0' // iOS 13+ for modern PWA features
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0052CC',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosSpinnerStyle: 'small',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0052CC',
      overlaysWebView: false
    },
    App: {
      launchUrl: '',
      deepLinkOnly: false
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Microphone: {
      permissions: ['microphone']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0052CC',
      sound: 'beep.wav'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  server: {
    cleartext: false, // HTTPS only for production
    allowNavigation: [
      'https://*'
    ],
    errorPath: 'error.html'
  }
};

export default config;
