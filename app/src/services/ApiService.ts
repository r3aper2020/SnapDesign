import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    tokens: '@snapdesign_tokens',
};

interface AuthTokens {
    idToken: string;
    refreshToken: string;
    expiresIn?: number;
}

export async function makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Get stored tokens
    const storedTokens = await AsyncStorage.getItem(STORAGE_KEYS.tokens);
    if (!storedTokens) {
        throw new Error('No authentication tokens found');
    }

    const tokens: AuthTokens = JSON.parse(storedTokens);

    // Ensure Content-Type is set for JSON requests
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Make the request with merged headers
    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,  // Default headers
            ...options.headers,  // User-provided headers
            'Authorization': `Bearer ${tokens.idToken}`,
            'X-Refresh-Token': tokens.refreshToken,
        },
    });

    // Handle token expiration
    if (response.status === 401) {
        const errorData = await response.json();

        // If server returned a new token, save it and retry the request
        if (errorData.retry && errorData.newToken) {
            // Update stored tokens
            const updatedTokens = {
                ...tokens,
                idToken: errorData.newToken
            };
            await AsyncStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(updatedTokens));

            // Update our local reference
            tokens.idToken = errorData.newToken;

            // Retry the request with new token
            return makeAuthenticatedRequest(url, options);
        }

        // If token refresh failed, throw error
        throw new Error('Authentication failed');
    }

    return response;
}
