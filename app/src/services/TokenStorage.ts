import * as SecureStore from 'expo-secure-store';

export interface AuthTokens {
    idToken: string;
    refreshToken: string;
    expiresIn?: number;
}

const STORAGE_KEYS = {
    tokens: 'auth_tokens',
    user: 'user_data',
};

class TokenStorage {
    async saveTokens(tokens: AuthTokens): Promise<void> {
        try {
            await SecureStore.setItemAsync(
                STORAGE_KEYS.tokens,
                JSON.stringify(tokens)
            );
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    }

    async getTokens(): Promise<AuthTokens | null> {
        try {
            const tokensStr = await SecureStore.getItemAsync(STORAGE_KEYS.tokens);
            return tokensStr ? JSON.parse(tokensStr) : null;
        } catch (error) {
            console.error('Error getting tokens:', error);
            return null;
        }
    }

    async clearTokens(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.tokens);
        } catch (error) {
            console.error('Error clearing tokens:', error);
            throw error;
        }
    }

    async saveUser(userData: any): Promise<void> {
        try {
            await SecureStore.setItemAsync(
                STORAGE_KEYS.user,
                JSON.stringify(userData)
            );
        } catch (error) {
            console.error('Error saving user data:', error);
            throw error;
        }
    }

    async getUser(): Promise<any | null> {
        try {
            const userStr = await SecureStore.getItemAsync(STORAGE_KEYS.user);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    async clearUser(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.user);
        } catch (error) {
            console.error('Error clearing user data:', error);
            throw error;
        }
    }

    async clearAll(): Promise<void> {
        await Promise.all([
            this.clearTokens(),
            this.clearUser(),
        ]);
    }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();
