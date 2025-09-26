import {
  FirestoreUser,
  FIRESTORE_COLLECTIONS,
  createDefaultUser,
  isFirestoreUser
} from '../schemas/firestoreSchema';
import { endpoints } from '../config/api';
import { makeAuthenticatedRequest } from './ApiService';

class FirestoreService {
  private idToken: string | null = null;

  async initialize(idToken: string): Promise<boolean> {
    try {
      this.idToken = idToken;
      return true;
    } catch (error) {
      console.error('Failed to initialize Firestore service:', error);
      return false;
    }
  }

  // User Operations
  async createUser(uid: string, email: string, displayName: string): Promise<FirestoreUser | null> {
    try {
      // First check if user already exists
      const existingUser = await this.getUser(uid);
      if (existingUser) {
        console.log('User already exists in Firestore, returning existing user');
        return existingUser;
      }

      // Create default user data
      const userData = createDefaultUser(uid, email, displayName);

      // Create user through server API
      const response = await makeAuthenticatedRequest(endpoints.firestore.createUser(uid), {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        console.error('Failed to create user in Firestore:', response.status);
        return null;
      }

      const data = await response.json();
      if (!isFirestoreUser(data)) {
        console.error('Invalid user data from Firestore');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      return null;
    }
  }
  async getUser(uid: string): Promise<FirestoreUser | null> {
    try {
      const response = await makeAuthenticatedRequest(endpoints.firestore.getUser(uid));
      if (!response.ok) {
        if (response.status === 404) {
          return null; // User doesn't exist
        }
        console.error('Failed to get user from Firestore:', response.status);
        return null;
      }

      const data = await response.json();
      if (!isFirestoreUser(data)) {
        console.error('Invalid user data from Firestore');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user from Firestore:', error);
      return null;
    }
  }

  async updateUserLastLogin(uid: string): Promise<boolean> {
    try {
      const response = await makeAuthenticatedRequest(endpoints.firestore.updateLastLogin(uid), {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating user last login:', error);
      return false;
    }
  }

  async updateUserStats(uid: string, stats: Partial<FirestoreUser['stats']>): Promise<boolean> {
    try {
      const response = await makeAuthenticatedRequest(endpoints.firestore.updateStats(uid), {
        method: 'POST',
        body: JSON.stringify(stats)
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return false;
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
