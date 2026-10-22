import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saad.skyfallball',
  appName: 'SkyFallBall',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    scheme: 'SkyFallBall'
  }
};

export default config;
