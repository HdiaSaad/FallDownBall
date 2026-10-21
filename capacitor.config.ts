import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saad.falldownball',
  appName: 'FallDownBall',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    scheme: 'FallDownBall'
  }
};

export default config;
