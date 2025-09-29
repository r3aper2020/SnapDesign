import type { Request, Response, NextFunction } from 'express';
import type { ServiceContext } from './types';
import * as admin from 'firebase-admin';
import { FirebaseUser } from './auth';
import { checkAndResetTokens, SubscriptionTier } from '../services/revenuecat';

interface TokenUsage {
    tokenRequestCount: number;
    subscriptionTier: SubscriptionTier;
    lastReset: string;
    nextReset: string | null;
}


// Import checkAndResetTokens from RevenueCat service instead of duplicating it here

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

        // Initialize Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check and reset tokens if needed
        const tokenUsage = await checkAndResetTokens(req.user.uid, ctx) || userData.tokenUsage;
        if (!tokenUsage) {
            return res.status(400).json({ error: 'Token usage not initialized' });
        }

        // Check if user has tokens available
        if (tokenUsage.tokenRequestCount <= 0) {
            return res.status(429).json({
                error: 'Token limit reached',
                subscriptionTier: tokenUsage.subscriptionTier,
                nextReset: tokenUsage.nextReset
            });
        }

        // Decrement token count
        const updatedTokenCount = tokenUsage.tokenRequestCount - 1;

        // Update Firestore with new token count
        await db.collection('users').doc(req.user.uid).update({
            'tokenUsage.tokenRequestCount': updatedTokenCount,
            updatedAt: new Date().toISOString()
        });

        // Add token usage info to response headers
        res.setHeader('X-Tokens-Remaining', updatedTokenCount);
        res.setHeader('X-Subscription-Tier', tokenUsage.subscriptionTier);
        if (tokenUsage.nextReset) {
            res.setHeader('X-Next-Reset', tokenUsage.nextReset);
        }

        next();
    } catch (error) {
        ctx.logger.error('Token usage check failed:', error);
        return res.status(500).json({ error: 'Failed to check token usage' });
    }
}
