import Constants from 'expo-constants';

export const API_BASE_URL: string = (Constants.expoConfig?.extra as any)?.apiBaseUrl || 'http://localhost:4000';

export const endpoints = {
  health: (): string => `${API_BASE_URL}/health`,
  design: (): string => `${API_BASE_URL}/design`,
  search: (): string => `${API_BASE_URL}/search`,
};
