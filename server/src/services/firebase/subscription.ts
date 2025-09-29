import * as admin from 'firebase-admin';
import { ServiceContext } from '../../core/types';

export enum SubscriptionTier {
    FREE = 'free',
    CREATOR = 'creator',
    PROFESSIONAL = 'professional'
}

export const DEFAULT_FREE_TOKENS = 10;
export const DEFAULT_CREATOR_TOKENS = 50;
export const DEFAULT_PROFESSIONAL_TOKENS = 125;

interface TokenUsage {
    tokenRequestCount: number;
    subscriptionTier: SubscriptionTier;
    lastReset: string;
    nextReset: string | null;
}

interface SubscriptionUpdate {
    tier: SubscriptionTier;
    tokensRemaining: number;
    subscriptionEndDate?: string;
}

export async function updateUserSubscription(
    userId: string,
    tier: SubscriptionTier,
    ctx: ServiceContext
): Promise<void> {
    try {
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        if (!userData) {
            throw new Error('User not found');
        }

        const now = new Date();
        const update: SubscriptionUpdate = {
            tier,
            tokensRemaining: getTokensForTier(tier),
        };

        // Add subscription end date for paid tiers
        if (tier !== SubscriptionTier.FREE) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // 1 month from now
            update.subscriptionEndDate = endDate.toISOString();
        }

        // Update user document with subscription info and token usage
        await db.collection('users').doc(userId).update({
            'subscription': update,
            'tokenUsage': {
                tokenRequestCount: update.tokensRemaining,
                subscriptionTier: tier,
                lastReset: now.toISOString(),
                nextReset: update.subscriptionEndDate
            },
            updatedAt: now.toISOString()
        });

        ctx.logger.info('Updated user subscription and tokens', {
            userId,
            tier,
            tokensRemaining: update.tokensRemaining,
            subscriptionEndDate: update.subscriptionEndDate
        });
    } catch (error) {
        ctx.logger.error('Failed to update user subscription', { userId, tier, error });
        throw error;
    }
}

export async function checkAndUpdateExpiredSubscriptions(ctx: ServiceContext): Promise<void> {
    try {
        const db = admin.firestore();
        const now = new Date();

        // Find users with expired subscriptions
        const expiredSubs = await db.collection('users')
            .where('subscription.subscriptionEndDate', '<=', now.toISOString())
            .where('subscription.tier', 'in', [SubscriptionTier.CREATOR, SubscriptionTier.PROFESSIONAL])
            .get();

        // Update each expired subscription to free tier
        const batch = db.batch();
        expiredSubs.docs.forEach(doc => {
            batch.update(doc.ref, {
                'subscription.tier': SubscriptionTier.FREE,
                'subscription.tokensRemaining': getTokensForTier(SubscriptionTier.FREE),
                'subscription.subscriptionEndDate': null,
                'tokenUsage': {
                    tokenRequestCount: getTokensForTier(SubscriptionTier.FREE),
                    subscriptionTier: SubscriptionTier.FREE,
                    lastReset: now.toISOString(),
                    nextReset: null
                },
                updatedAt: now.toISOString()
            });
        });

        await batch.commit();
        ctx.logger.info('Updated expired subscriptions', { count: expiredSubs.size });
    } catch (error) {
        ctx.logger.error('Failed to update expired subscriptions', error);
        throw error;
    }
}

function getTokensForTier(tier: SubscriptionTier): number {
    switch (tier) {
        case SubscriptionTier.FREE:
            return DEFAULT_FREE_TOKENS;
        case SubscriptionTier.CREATOR:
            return DEFAULT_CREATOR_TOKENS;
        case SubscriptionTier.PROFESSIONAL:
            return DEFAULT_PROFESSIONAL_TOKENS;
        default:
            return 0;
    }
}