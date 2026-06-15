import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.weeklink.crm',
  appName: 'Weeklink',
  // En producción apunta al servidor — la app carga desde la web
  server: {
    url: 'https://boostmarketingboost.com',
    cleartext: false,
    androidScheme: 'https',
  },
  // webDir apunta a public/ que siempre existe (en runtime usa server.url)
  webDir: 'public',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#07070A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#07070A',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    // Para App Store — requiere Apple Developer account
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    // Para Google Play
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // true solo en desarrollo
  },
};

export default config;
