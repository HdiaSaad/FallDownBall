import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saad.skyfallball',
  appName: 'SkyFallBall',
  webDir: 'www',
  backgroundColor: '#0f0f1aff',
  ios: {
    contentInset: 'never',
    scheme: 'SkyFallBall',
    backgroundColor: '#0f0f1aff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#0f0f1a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
