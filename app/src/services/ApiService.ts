import { tokenStorage } from './TokenStorage';
import { endpoints } from '../config/api';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

class ApiService {
    private static instance: ApiService;
    private isRefreshing = false;
    private refreshPromise: Promise<boolean> | null = null;

    private constructor() { }

    static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    private async getAuthHeader(): Promise<string | null> {
        const tokens = await tokenStorage.getTokens();
        return tokens ? `Bearer ${tokens.idToken}` : null;
    }

    private async refreshToken(): Promise<boolean> {
        if (this.isRefreshing) {
            return this.refreshPromise!;
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                const tokens = await tokenStorage.getTokens();
                if (!tokens?.refreshToken) {
                    return false;
                }

                const response = await fetch(endpoints.auth.refresh(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
                });

                if (!response.ok) {
                    await tokenStorage.clearAll();
                    return false;
                }

                const data = await response.json();
                await tokenStorage.saveTokens({
                    idToken: data.idToken,
                    refreshToken: data.refreshToken,
                    expiresIn: data.expiresIn,
                });

                return true;
            } catch (error) {
                console.error('Token refresh failed:', error);
                await tokenStorage.clearAll();
                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
        const { skipAuth = false, ...fetchOptions } = options;

        // Add auth header if needed
        if (!skipAuth) {
            const authHeader = await this.getAuthHeader();
            if (authHeader) {
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    'Authorization': authHeader,
                };
            }
        }

        // Add default headers
        fetchOptions.headers = {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        };

        try {
            const response = await fetch(url, fetchOptions);

            // Handle 401 by refreshing token and retrying
            if (response.status === 401 && !skipAuth) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry with new token
                    const authHeader = await this.getAuthHeader();
                    if (authHeader) {
                        fetchOptions.headers = {
                            ...fetchOptions.headers,
                            'Authorization': authHeader,
                        };
                    }
                    const retryResponse = await fetch(url, fetchOptions);
                    if (!retryResponse.ok) {
                        throw new ApiError(retryResponse.status, await retryResponse.text());
                    }
                    return retryResponse.json();
                }
                throw new ApiError(401, 'Authentication failed');
            }

            if (!response.ok) {
                throw new ApiError(response.status, await response.text());
            }

            return response.json();
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(0, 'Network error');
        }
    }

    async get<T>(url: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(url, { ...options, method: 'GET' });
    }

    async post<T>(url: string, data: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(url: string, data: any, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(url: string, options: RequestOptions = {}): Promise<T> {
        return this.request<T>(url, { ...options, method: 'DELETE' });
    }
}

export const apiService = ApiService.getInstance();