import Constants from 'expo-constants';

export const API_BASE_URL: string = (Constants.expoConfig?.extra as any)?.apiBaseUrl || 'http://localhost:4000';

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
};
