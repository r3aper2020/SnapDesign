import { ExpoConfig } from 'expo/config';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const config: ExpoConfig = {
  name: 'ReVibe',
  plugins: [
    'expo-secure-store',
    'expo-sqlite',
    'expo-image-picker',
    'expo-media-library'
  ],
  slug: 'ReVibe',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/re-vibe.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/re-vibe.png',
    resizeMode: 'contain',
    backgroundColor: '#121212',
  },
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/re-vibe.png',
      backgroundColor: '#121212',
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/re-vibe.png',
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000',
    apiKey:
      process.env.EXPO_PUBLIC_API_KEY ||
      process.env.API_KEY ||
      process.env.EXPO_PUBLIC_SERVER_API_KEY ||
      process.env.SERVER_API_KEY,
  },
};

export default config;
