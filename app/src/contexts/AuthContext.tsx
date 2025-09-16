import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { endpoints } from '../config/api';
import { firestoreService } from '../services/FirestoreService';
import { FirestoreUser } from '../schemas/firestoreSchema';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified?: boolean;
  firestoreUser?: FirestoreUser; // Extended user data from Firestore
}

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
  expiresIn?: number;
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

const STORAGE_KEYS = {
  user: '@snapdesign_user',
  tokens: '@snapdesign_tokens',
};

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
        AsyncStorage.getItem(STORAGE_KEYS.user),
        AsyncStorage.getItem(STORAGE_KEYS.tokens),
      ]);
      
      if (storedUser && storedTokens) {
        const userData = JSON.parse(storedUser);
        const tokens = JSON.parse(storedTokens);
        
        // Verify token is still valid
        const isValid = await verifyToken(tokens.idToken);
        if (isValid) {
          // Load Firestore user data
          const firestoreUser = await loadUserFromFirestore(userData.id, tokens.idToken, userData.email, userData.name);
          if (firestoreUser) {
            userData.firestoreUser = firestoreUser;
          }
          setUser(userData);
        } else {
          // Try to refresh token
          const refreshed = await refreshAuthToken(tokens.refreshToken);
          if (refreshed) {
            // Load Firestore user data with refreshed token
            const firestoreUser = await loadUserFromFirestore(userData.id, tokens.idToken, userData.email, userData.name);
            if (firestoreUser) {
              userData.firestoreUser = firestoreUser;
            }
            setUser(userData);
          } else {
            // Clear invalid data
            await clearStorage();
          }
        }
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      await clearStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserToStorage = async (userData: User, tokens: AuthTokens) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData)),
        AsyncStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(tokens)),
      ]);
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  };

  const clearStorage = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.user),
        AsyncStorage.removeItem(STORAGE_KEYS.tokens),
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const verifyToken = async (idToken: string): Promise<boolean> => {
    try {
      const response = await fetch(endpoints.auth.me(), {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  };

  const refreshAuthToken = async (refreshToken: string): Promise<boolean> => {
    try {
      const response = await fetch(endpoints.auth.refresh(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const tokens: AuthTokens = {
          idToken: data.idToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        };
        
        // Save refreshed tokens
        if (user) {
          await saveUserToStorage(user, tokens);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const loadUserFromFirestore = async (uid: string, idToken: string, email: string, displayName: string): Promise<FirestoreUser | null> => {
    try {
      console.log('Loading user from Firestore:', { uid, email, displayName });
      
      // Initialize Firestore service
      const initialized = await firestoreService.initialize(idToken);
      if (!initialized) {
        console.error('Failed to initialize Firestore service');
        return null;
      }

      // Get user from Firestore
      let firestoreUser = await firestoreService.getUser(uid);
      
      // If user doesn't exist in Firestore, create them
      if (!firestoreUser) {
        console.log('User not found in Firestore, creating new user document for:', uid);
        firestoreUser = await firestoreService.createUser(uid, email, displayName);
        if (firestoreUser) {
          console.log('Successfully created user document in Firestore');
        } else {
          console.error('Failed to create user document in Firestore');
        }
      } else {
        console.log('User found in Firestore, updating last login time');
        // Update last login time
        await firestoreService.updateUserLastLogin(uid);
      }

      return firestoreUser;
    } catch (error) {
      console.error('Error loading user from Firestore:', error);
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(endpoints.auth.login(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed. Please try again.' };
      }

      const userData: User = {
        id: data.uid,
        email: data.email,
        name: data.displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
        emailVerified: data.emailVerified,
      };

      const tokens: AuthTokens = {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
      };

      // Load user data from Firestore
      const firestoreUser = await loadUserFromFirestore(data.uid, data.idToken, data.email, data.displayName || email.split('@')[0]);
      if (firestoreUser) {
        userData.firestoreUser = firestoreUser;
      }

      setUser(userData);
      await saveUserToStorage(userData, tokens);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(endpoints.auth.signup(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          displayName: name 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Signup failed. Please try again.' };
      }

      const userData: User = {
        id: data.uid,
        email: data.email,
        name: data.displayName || name,
        createdAt: new Date().toISOString(),
        emailVerified: data.emailVerified,
      };

      const tokens: AuthTokens = {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
      };

      // Load user data from Firestore (this will create the user document)
      const firestoreUser = await loadUserFromFirestore(data.uid, data.idToken, data.email, data.displayName || name);
      if (firestoreUser) {
        userData.firestoreUser = firestoreUser;
      }

      setUser(userData);
      await saveUserToStorage(userData, tokens);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      await clearStorage();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      
      // Get current tokens to save with updated user
      try {
        const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.tokens);
        if (storedTokens) {
          const tokens = JSON.parse(storedTokens);
          await saveUserToStorage(updatedUser, tokens);
        }
      } catch (error) {
        console.error('Error updating user:', error);
      }
    }
  };

  const updateFirestoreUser = async (updates: Partial<FirestoreUser>): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const updatedFirestoreUser = await firestoreService.updateUser(user.id, updates);
      if (updatedFirestoreUser) {
        // Update local user data
        const updatedUser = { ...user, firestoreUser: updatedFirestoreUser };
        setUser(updatedUser);
        
        // Save to storage
        const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.tokens);
        if (storedTokens) {
          const tokens = JSON.parse(storedTokens);
          await saveUserToStorage(updatedUser, tokens);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating Firestore user:', error);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(endpoints.auth.resetPassword(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Password reset failed. Please try again.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
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
