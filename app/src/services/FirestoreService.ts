import {
  FirestoreUser,
  FIRESTORE_COLLECTIONS,
  createDefaultUser,
  isFirestoreUser
} from '../schemas/firestoreSchema';
import { endpoints } from '../config/api';
import { makeAuthenticatedRequest } from './ApiService';

export interface FirestoreConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

class FirestoreService {
  private config: FirestoreConfig | null = null;
  private idToken: string | null = null;
  private isDisabled: boolean = true; // Safety flag - DISABLED BY DEFAULT to prevent further damage

  async initialize(idToken: string): Promise<boolean> {
    try {
      this.idToken = idToken;

      // Get Firestore config from server using authenticated request
      const response = await makeAuthenticatedRequest(endpoints.firestore.config());

      if (!response.ok) {
        console.error('Failed to get Firestore config:', response.status);
        return false;
      }

      const data = await response.json();
      this.config = data.config;

      // Enable the service after successful initialization
      this.enable();

      return true;
    } catch (error) {
      console.error('Failed to initialize Firestore service:', error);
      return false;
    }
  }

  private getFirestoreUrl(path: string): string {
    if (!this.config) {
      throw new Error('Firestore service not initialized');
    }
    return `https://firestore.googleapis.com/v1/projects/${this.config.projectId}/databases/(default)/documents/${path}`;
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.idToken) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${this.idToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async isServiceReady(): Promise<boolean> {
    if (this.isDisabled) {
      console.warn('Firestore service is disabled for safety');
      return false;
    }
    if (!this.config || !this.idToken) {
      console.error('Firestore service not properly initialized');
      return false;
    }
    return true;
  }

  // Safety methods
  disable(): void {
    console.warn('Firestore service disabled for safety');
    this.isDisabled = true;
  }

  enable(): void {
    console.log('Firestore service enabled');
    this.isDisabled = false;
  }

  // User Operations
  async createUser(uid: string, email: string, displayName: string): Promise<FirestoreUser | null> {
    try {
      // Safety check
      if (!(await this.isServiceReady())) {
        return null;
      }

      // First check if user already exists
      const existingUser = await this.getUser(uid);
      if (existingUser) {
        console.log('User already exists in Firestore, returning existing user');
        return existingUser;
      }

      const userData = createDefaultUser(uid, email, displayName);
      const firestoreUser: FirestoreUser = { uid, ...userData };

      // Use PATCH to create/update a document with specific ID
      // PATCH to the specific document path
      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: this.convertToFirestoreFields(firestoreUser),
        }),
      });

      if (!response.ok) {
        // If document already exists (409 conflict), try to get the existing user
        if (response.status === 409) {
          console.log('User document already exists, fetching existing user');
          return await this.getUser(uid);
        }
        console.error('Failed to create user in Firestore:', response.status, await response.text());
        return null;
      }

      console.log('Successfully created user in Firestore:', uid);
      return firestoreUser;
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      return null;
    }
  }

  async getUser(uid: string): Promise<FirestoreUser | null> {
    try {
      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User doesn't exist
        }
        console.error('Failed to get user from Firestore:', response.status);
        return null;
      }

      const data = await response.json();
      const user = this.convertFromFirestoreFields(data.fields);

      if (!isFirestoreUser(user)) {
        console.error('Invalid user data from Firestore');
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting user from Firestore:', error);
      return null;
    }
  }

  async updateUser(uid: string, updates: Partial<FirestoreUser>): Promise<FirestoreUser | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: this.convertToFirestoreFields(updateData),
        }),
      });

      if (!response.ok) {
        console.error('Failed to update user in Firestore:', response.status);
        return null;
      }

      // Get updated user data
      return await this.getUser(uid);
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      return null;
    }
  }

  async updateUserLastLogin(uid: string): Promise<boolean> {
    try {
      // Safety check
      if (!(await this.isServiceReady())) {
        return false;
      }

      // Get the current user data first to preserve existing fields
      const currentUser = await this.getUser(uid);
      if (!currentUser) {
        console.error('Cannot update last login: user not found');
        return false;
      }

      // Update only the specific fields we want to change
      const now = new Date().toISOString();
      const updatedUser = {
        ...currentUser,
        lastLoginAt: now,
        stats: {
          ...currentUser.stats,
          lastActiveAt: now,
        },
        updatedAt: now,
      };

      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: this.convertToFirestoreFields(updatedUser),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating user last login:', error);
      return false;
    }
  }

  async updateUserStats(uid: string, stats: Partial<FirestoreUser['stats']>): Promise<boolean> {
    try {
      // Safety check
      if (!(await this.isServiceReady())) {
        return false;
      }

      // Get the current user data first to preserve existing fields
      const currentUser = await this.getUser(uid);
      if (!currentUser) {
        console.error('Cannot update user stats: user not found');
        return false;
      }

      // Update only the specific stats fields we want to change
      const now = new Date().toISOString();
      const updatedUser = {
        ...currentUser,
        stats: {
          ...currentUser.stats,
          ...stats,
          lastActiveAt: now,
        },
        updatedAt: now,
      };

      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: this.convertToFirestoreFields(updatedUser),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return false;
    }
  }

  // Helper methods for Firestore field conversion
  private convertToFirestoreFields(obj: any): Record<string, any> {
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        // Handle both integers and doubles
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: value.toString() };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (value instanceof Date) {
        fields[key] = { timestampValue: value.toISOString() };
      } else if (Array.isArray(value)) {
        fields[key] = { arrayValue: { values: value.map(v => this.convertToFirestoreFields(v)) } };
      } else if (typeof value === 'object') {
        fields[key] = { mapValue: { fields: this.convertToFirestoreFields(value) } };
      }
    }

    return fields;
  }

  private convertFromFirestoreFields(fields: Record<string, any>): any {
    const obj: any = {};

    for (const [key, field] of Object.entries(fields)) {
      if (field.stringValue !== undefined) {
        obj[key] = field.stringValue;
      } else if (field.integerValue !== undefined) {
        obj[key] = parseInt(field.integerValue);
      } else if (field.doubleValue !== undefined) {
        obj[key] = field.doubleValue;
      } else if (field.booleanValue !== undefined) {
        obj[key] = field.booleanValue;
      } else if (field.timestampValue !== undefined) {
        obj[key] = new Date(field.timestampValue).toISOString();
      } else if (field.arrayValue !== undefined) {
        obj[key] = field.arrayValue.values.map((v: any) => this.convertFromFirestoreFields(v));
      } else if (field.mapValue !== undefined) {
        obj[key] = this.convertFromFirestoreFields(field.mapValue.fields);
      }
    }

    return obj;
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();
