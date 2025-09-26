import type { Request, Response, NextFunction } from 'express';
import type { ServiceContext } from './types';

// Error codes from Firebase Auth
const FIREBASE_ERROR_CODES = {
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    INVALID_ID_TOKEN: 'INVALID_ID_TOKEN'
};

export interface FirebaseUser {
    uid: string;
    email: string;
    displayName?: string;
    emailVerified: boolean;
    idToken: string; // Add idToken to the type
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: FirebaseUser;
            refreshToken?: string; // Add refresh token to request
        }
    }
}

async function refreshIdToken(refreshToken: string, webApiKey: string, ctx: ServiceContext): Promise<string | null> {
    try {
        const response = await fetch(
            `https://securetoken.googleapis.com/v1/token?key=${webApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            }
        );

        const data = await response.json();
        if (!response.ok) {
            return null;
        }

        ctx.logger.info('Refreshed token', { data });

        return data.id_token;
    } catch (err) {
        return null;
    }
}

export async function verifyFirebaseToken(
    req: Request,
    res: Response,
    next: NextFunction,
    ctx: ServiceContext
) {
    try {
        const authHeader = req.header('authorization') || '';
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring('Bearer '.length)
            : undefined;

        // Get refresh token from header if provided
        const refreshHeader = req.header('x-refresh-token') || '';
        const refreshToken = refreshHeader.length > 0 ? refreshHeader : undefined;

        if (!token) {
            return res.status(401).json({ error: 'Missing bearer token' });
        }

        // Additional security: token format validation
        if (token.length < 100) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const webApiKey = process.env.FIREBASE_WEB_API_KEY;
        if (!webApiKey) {
            ctx.logger.error('Firebase Web API Key not configured');
            return res.status(503).json({ error: 'Authentication service not configured' });
        }

        // Validate token using Identity Toolkit
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            // Check if token is expired and we have a refresh token
            if (data.error?.message === FIREBASE_ERROR_CODES.TOKEN_EXPIRED && refreshToken) {
                const newIdToken = await refreshIdToken(refreshToken, webApiKey, ctx);
                if (newIdToken) {
                    // Return new token to client and ask them to retry
                    return res.status(401).json({
                        error: 'Token expired',
                        newToken: newIdToken,
                        retry: true
                    });
                }
            }

            ctx.logger.warn('Invalid token verification attempt', {
                status: response.status,
                error: data.error?.message,
                hasToken: !!token,
                tokenLength: token?.length
            });
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!data.users || data.users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = data.users[0];

        ctx.logger.info('Verified user', { user });

        // Attach verified user data to request
        req.user = {
            uid: user.localId,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified === 'true',
            idToken: token

        };

        // Store refresh token if provided
        if (refreshToken) {
            req.refreshToken = refreshToken;
        }

        next();
    } catch (err) {
        ctx.logger.error('Token verification failed', err);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}
