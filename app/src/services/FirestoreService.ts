import { 
  FirestoreUser, 
  FIRESTORE_COLLECTIONS, 
  createDefaultUser,
  isFirestoreUser 
} from '../schemas/firestoreSchema';
import { endpoints } from '../config/api';

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

  async initialize(idToken: string): Promise<boolean> {
    try {
      this.idToken = idToken;
      
      // Get Firestore config from server
      const response = await fetch(endpoints.firestore.config(), {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to get Firestore config:', response.status);
        return false;
      }

      const data = await response.json();
      this.config = data.config;
      
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

  // User Operations
  async createUser(uid: string, email: string, displayName: string): Promise<FirestoreUser | null> {
    try {
      // First check if user already exists
      const existingUser = await this.getUser(uid);
      if (existingUser) {
        console.log('User already exists in Firestore, returning existing user');
        return existingUser;
      }

      const userData = createDefaultUser(uid, email, displayName);
      const firestoreUser: FirestoreUser = { uid, ...userData };

      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: this.convertToFirestoreFields(firestoreUser),
        }),
      });

      if (!response.ok) {
        console.error('Failed to create user in Firestore:', response.status);
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
      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: {
            lastLoginAt: { stringValue: new Date().toISOString() },
            'stats.lastActiveAt': { stringValue: new Date().toISOString() },
          },
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
      const response = await fetch(this.getFirestoreUrl(`${FIRESTORE_COLLECTIONS.USERS}/${uid}`), {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fields: {
            'stats.lastActiveAt': { stringValue: new Date().toISOString() },
            ...this.convertToFirestoreFields({ stats }),
          },
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
        fields[key] = { integerValue: value.toString() };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
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
      } else if (field.booleanValue !== undefined) {
        obj[key] = field.booleanValue;
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
