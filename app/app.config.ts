import type { ExpoConfig } from 'expo';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const config: ExpoConfig = {
  name: 'SnapDesign',
  slug: 'SnapDesign',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },
  web: { favicon: './assets/favicon.png' },
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  },
};

export default config;
