import type { Request, Response, NextFunction } from 'express';
import type { ServiceContext } from './types';
import * as admin from 'firebase-admin';
import { FirebaseUser } from './auth';
import { SubscriptionTier } from '../services/firebase/subscription';

interface TokenUsage {
    tokenRequestCount: number;
    subscriptionTier: SubscriptionTier;
}

const FREE_TOKENS = 10;


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

        // Initialize Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data() || {};

        const now = new Date();
        let tokenUsage: TokenUsage = {
            tokenRequestCount: FREE_TOKENS,
            subscriptionTier: SubscriptionTier.FREE
        };

        // Check if user has tokens available
        if (tokenUsage.tokenRequestCount <= 0) {
            return res.status(429).json({
                error: 'Token limit reached',
                subscriptionTier: tokenUsage.subscriptionTier
            });
        }

        // Decrement free tokens if not subscribed
        tokenUsage.tokenRequestCount--;

        // Update Firestore with new token count
        await db.collection('users').doc(req.user.uid).update({
            tokenUsage: {
                tokenRequestCount: tokenUsage.tokenRequestCount,
                subscriptionTier: tokenUsage.subscriptionTier
            }
        });

        // Add token usage info to response headers
        res.setHeader('X-Tokens-Remaining', tokenUsage.tokenRequestCount);
        res.setHeader('X-Tokens-Subscribed', tokenUsage.subscriptionTier.toString());

        next();
    } catch (error) {
        ctx.logger.error('Token usage check failed:', error);
        return res.status(500).json({ error: 'Failed to check token usage' });
    }
}
