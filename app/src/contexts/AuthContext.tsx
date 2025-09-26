import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/ApiService';
import { tokenStorage } from '../services/TokenStorage';
import { FirestoreUser } from '../schemas/firestoreSchema';
import { endpoints } from '../config/api';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified?: boolean;
  firestoreUser?: FirestoreUser;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateFirestoreUser: (updates: Partial<FirestoreUser>) => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Load user from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const [storedUser, storedTokens] = await Promise.all([
        tokenStorage.getUser(),
        tokenStorage.getTokens(),
      ]);

      if (storedUser && storedTokens) {
        try {
          // Verify token is still valid by fetching user data from server
          const userData = await apiService.get<User>(endpoints.auth.me());
          setUser(userData);
        } catch (error) {
          // If token is invalid, clear storage
          await tokenStorage.clearAll();
        }
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      await tokenStorage.clearAll();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await apiService.post<{
        uid: string;
        email: string;
        displayName: string;
        emailVerified: boolean;
        idToken: string;
        refreshToken: string;
        firestoreUser: FirestoreUser;
      }>(endpoints.auth.login(), { email, password }, { skipAuth: true });

      const userData: User = {
        id: response.uid,
        email: response.email,
        name: response.displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
        emailVerified: response.emailVerified,
        firestoreUser: response.firestoreUser,
      };

      await Promise.all([
        tokenStorage.saveUser(userData),
        tokenStorage.saveTokens({
          idToken: response.idToken,
          refreshToken: response.refreshToken,
        }),
      ]);

      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await apiService.post<{
        uid: string;
        email: string;
        displayName: string;
        emailVerified: boolean;
        idToken: string;
        refreshToken: string;
        firestoreUser: FirestoreUser;
      }>(endpoints.auth.signup(), {
        email,
        password,
        displayName: name
      }, { skipAuth: true });

      const userData: User = {
        id: response.uid,
        email: response.email,
        name: response.displayName || name,
        createdAt: new Date().toISOString(),
        emailVerified: response.emailVerified,
        firestoreUser: response.firestoreUser,
      };

      await Promise.all([
        tokenStorage.saveUser(userData),
        tokenStorage.saveTokens({
          idToken: response.idToken,
          refreshToken: response.refreshToken,
        }),
      ]);

      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signup failed. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      await tokenStorage.clearAll();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      await tokenStorage.saveUser(updatedUser);
    }
  };

  const updateFirestoreUser = async (updates: Partial<FirestoreUser>): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const updatedFirestoreUser = await apiService.put<FirestoreUser>(
        endpoints.firestore.updateStats(user.id),
        updates
      );

      // Update local user data
      const updatedUser = { ...user, firestoreUser: updatedFirestoreUser };
      setUser(updatedUser);
      await tokenStorage.saveUser(updatedUser);

      return true;
    } catch (error) {
      console.error('Error updating Firestore user:', error);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiService.post(endpoints.auth.resetPassword(), { email }, { skipAuth: true });
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed. Please try again.'
      };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
    updateFirestoreUser,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};