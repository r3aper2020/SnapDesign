import type { Request, Response, NextFunction } from 'express';
import type { ServiceContext } from './types';

import { FirebaseUser } from './auth';

interface TokenUsage {
    tokenRequestCount: number;
    nextUpdate: string; // ISO date string
}

const DEFAULT_MONTHLY_TOKENS = 10;

function getNextUpdateDate(): string {
    const now = new Date();
    // Set to first day of next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
}

export async function checkTokenUsage(
    req: Request,
    res: Response,
    next: NextFunction,
    ctx: ServiceContext
) {
    try {
        if (!req.user?.uid) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const webApiKey = process.env.FIREBASE_WEB_API_KEY;
        if (!webApiKey) {
            ctx.logger.error('Firebase Web API Key not configured');
            return res.status(503).json({ error: 'Service not configured' });
        }

        // Get user's token usage from Firestore
        const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${req.user.uid}`,
            {
                headers: {
                    'Authorization': `Bearer ${req.user.idToken}`,
                }
            }
        );

        if (!response.ok) {
            ctx.logger.error('Failed to get user document:', response.status);
            return res.status(500).json({ error: 'Failed to check token usage' });
        }

        const data = await response.json();
        const userData = data.fields || {};

        const now = new Date();
        let tokenUsage: TokenUsage = {
            tokenRequestCount: DEFAULT_MONTHLY_TOKENS,
            nextUpdate: getNextUpdateDate()
        };

        // If user has existing token usage data
        if (userData.tokenUsage?.mapValue?.fields) {
            const existingUsage = userData.tokenUsage.mapValue.fields;
            const nextUpdate = new Date(existingUsage.nextUpdate?.stringValue);

            // Check if it's time to reset tokens
            if (now >= nextUpdate) {
                tokenUsage.nextUpdate = getNextUpdateDate();
                tokenUsage.tokenRequestCount = DEFAULT_MONTHLY_TOKENS;
            } else {
                tokenUsage = {
                    tokenRequestCount: parseInt(existingUsage.tokenRequestCount?.integerValue || DEFAULT_MONTHLY_TOKENS),
                    nextUpdate: existingUsage.nextUpdate?.stringValue || getNextUpdateDate()
                };
            }
        }

        // Check if user has tokens available
        if (tokenUsage.tokenRequestCount <= 0) {
            return res.status(429).json({
                error: 'Token limit reached',
                nextUpdate: tokenUsage.nextUpdate
            });
        }

        // Decrement token count
        tokenUsage.tokenRequestCount--;

        // Update Firestore with new token count
        const updateResponse = await fetch(
            `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${req.user.uid}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${req.user.idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        tokenUsage: {
                            mapValue: {
                                fields: {
                                    tokenRequestCount: {
                                        integerValue: tokenUsage.tokenRequestCount
                                    },
                                    nextUpdate: {
                                        stringValue: tokenUsage.nextUpdate
                                    }
                                }
                            }
                        }
                    }
                })
            }
        );

        if (!updateResponse.ok) {
            ctx.logger.error('Failed to update token usage:', updateResponse.status);
            return res.status(500).json({ error: 'Failed to update token usage' });
        }

        // Add token usage info to response headers
        res.setHeader('X-Tokens-Remaining', tokenUsage.tokenRequestCount);
        res.setHeader('X-Tokens-Reset-Date', tokenUsage.nextUpdate);

        next();
    } catch (error) {
        ctx.logger.error('Token usage check failed:', error);
        return res.status(500).json({ error: 'Failed to check token usage' });
    }
}
