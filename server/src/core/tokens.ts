import type { Request, Response, NextFunction } from 'express';
import type { ServiceContext } from './types';
import * as admin from 'firebase-admin';
import { FirebaseUser } from './auth';
import { DEFAULT_FREE_TOKENS } from '../services/revenuecat';
import { checkAndResetTokens, SubscriptionTier } from '../services/revenuecat';

interface TokenUsage {
    tokenRequestCount: number;
    subscriptionTier: SubscriptionTier;
    lastReset: string;
    nextReset: string | null;
    subscriptionEndDate?: string | null;
}

// Check if subscription has expired and should be reset to free tier
async function checkSubscriptionExpiry(
    userId: string,
    tokenUsage: TokenUsage,
    ctx: ServiceContext
): Promise<TokenUsage | null> {
    try {
        // Only check paid subscriptions
        if (tokenUsage.subscriptionTier === SubscriptionTier.FREE) {
            return null;
        }

        const now = new Date();

        // Check subscription end date first (most efficient)
        if (tokenUsage.subscriptionEndDate && new Date(tokenUsage.subscriptionEndDate) <= now) {
            ctx.logger.info('Subscription expired by date', { userId });
            return {
                tokenRequestCount: DEFAULT_FREE_TOKENS,
                subscriptionTier: SubscriptionTier.FREE,
                lastReset: now.toISOString(),
                nextReset: new Date(now.setMonth(now.getMonth() + 1)).toISOString(),
                subscriptionEndDate: null
            };
        }

        // Only check RevenueCat if subscription should still be active
        const { getSubscriber, getSubscriptionTier } = await import('../services/revenuecat');
        const subscriber = await getSubscriber(userId);
        const currentTier = subscriber ? getSubscriptionTier(subscriber) : SubscriptionTier.FREE;

        // If subscription is no longer active in RevenueCat
        if (currentTier === SubscriptionTier.FREE) {
            ctx.logger.info('Subscription cancelled in RevenueCat', { userId });
            return {
                tokenRequestCount: DEFAULT_FREE_TOKENS,
                subscriptionTier: SubscriptionTier.FREE,
                lastReset: now.toISOString(),
                nextReset: new Date(now.setMonth(now.getMonth() + 1)).toISOString(),
                subscriptionEndDate: null
            };
        }

        return null; // No changes needed
    } catch (error) {
        ctx.logger.error('Failed to check subscription expiry:', error);
        return null; // On error, continue with existing token usage
    }
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

        // Initialize Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get current token usage
        let tokenUsage = userData.tokenUsage;
        if (!tokenUsage) {
            return res.status(400).json({ error: 'Token usage not initialized' });
        }

        // First check if subscription has expired
        const expiredTokenUsage = await checkSubscriptionExpiry(req.user.uid, tokenUsage, ctx);
        if (expiredTokenUsage) {
            // Update Firestore with expired subscription data
            await db.collection('users').doc(req.user.uid).update({
                tokenUsage: expiredTokenUsage,
                updatedAt: new Date().toISOString()
            });
            tokenUsage = expiredTokenUsage;
        }

        // Then check if tokens need to be reset (monthly refresh)
        const resetTokenUsage = await checkAndResetTokens(req.user.uid, ctx);
        if (resetTokenUsage) {
            // Update Firestore with reset token data
            await db.collection('users').doc(req.user.uid).update({
                tokenUsage: resetTokenUsage,
                updatedAt: new Date().toISOString()

            });
            tokenUsage = resetTokenUsage;
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
