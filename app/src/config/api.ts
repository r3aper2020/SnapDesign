import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;

const resolveFromExtra = <T>(key: string): T | undefined => {
  const value = extra[key];
  return typeof value === 'string' ? (value as T) : undefined;
};

const resolveFromEnv = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

export const API_BASE_URL: string =
  resolveFromExtra<string>('apiBaseUrl') ||
  resolveFromEnv('EXPO_PUBLIC_API_BASE_URL', 'API_BASE_URL') ||
  'http://localhost:4000';

export const API_KEY: string | undefined =
  resolveFromExtra<string>('apiKey') ||
  resolveFromEnv(
    'EXPO_PUBLIC_API_KEY',
    'EXPO_PUBLIC_SERVER_API_KEY',
    'SERVER_API_KEY',
    'API_KEY'
  );

export const endpoints = {
  health: (): string => `${API_BASE_URL}/design/health`,
  decorate: (): string => `${API_BASE_URL}/design/decorate`,
  edit: (): string => `${API_BASE_URL}/design/edit`,
  search: (): string => `${API_BASE_URL}/design/search`,
  // Authentication endpoints
  auth: {
    signup: (): string => `${API_BASE_URL}/auth/signup`,
    login: (): string => `${API_BASE_URL}/auth/login`,
    refresh: (): string => `${API_BASE_URL}/auth/refresh`,
    me: (): string => `${API_BASE_URL}/auth/me`,
    resetPassword: (): string => `${API_BASE_URL}/auth/reset-password`,
  },
  // Firestore endpoints
  firestore: {
    getUser: (uid: string): string => `${API_BASE_URL}/firestore/users/${uid}`,
    createUser: (uid: string): string => `${API_BASE_URL}/firestore/users/${uid}`,
    updateLastLogin: (uid: string): string => `${API_BASE_URL}/firestore/users/${uid}/last-login`,
    updateStats: (uid: string): string => `${API_BASE_URL}/firestore/users/${uid}/stats`,
  },
  // Subscription endpoints
  subscription: {
    update: (): string => `${API_BASE_URL}/revenuecat/subscriptions/update`,
    status: (userId: string): string => `${API_BASE_URL}/revenuecat/subscribers/${userId}`,
    prorate: (userId: string, targetTier: string): string => `${API_BASE_URL}/revenuecat/prorate/${userId}?targetTier=${targetTier}`,
  },
};
