import { Express, Request, Response } from 'express';
import { ServiceContext } from '../../core/types';
import { verifyFirebaseToken } from '../../core/auth';
import { SubscriptionTier, updateUserSubscription } from './subscription';
import * as admin from 'firebase-admin';

export function registerSubscriptionRoutes(app: Express, ctx: ServiceContext) {
    // POST /subscription/update - Update user's subscription
    app.post('/subscription/update',
        (req, res, next) => verifyFirebaseToken(req, res, next, ctx),
        async (req, res) => {
            try {
                if (!req.user?.uid) {
                    return res.status(401).json({ error: 'User not authenticated' });
                }

                const { tier } = req.body;
                if (!tier || !Object.values(SubscriptionTier).includes(tier)) {
                    return res.status(400).json({ error: 'Invalid subscription tier' });
                }

                await updateUserSubscription(req.user.uid, tier as SubscriptionTier, ctx);

                res.json({
                    success: true,
                    message: 'Subscription updated successfully',
                    tier
                });
            } catch (error) {
                ctx.logger.error('Failed to update subscription', error);
                res.status(500).json({ error: 'Failed to update subscription' });
            }
        }
    );

    // GET /subscription/status - Get user's subscription status
    app.get('/subscription/status',
        (req, res, next) => verifyFirebaseToken(req, res, next, ctx),
        async (req, res) => {
            try {
                if (!req.user?.uid) {
                    return res.status(401).json({ error: 'User not authenticated' });
                }

                const db = admin.firestore();
                const userDoc = await db.collection('users').doc(req.user.uid).get();
                const userData = userDoc.data();

                if (!userData) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.json({
                    subscription: userData.subscription || {
                        tier: SubscriptionTier.FREE,
                        tokensRemaining: 10
                    },
                    tokenUsage: userData.tokenUsage || {
                        tokenRequestCount: 10,
                        subscriptionTier: SubscriptionTier.FREE,
                        lastReset: new Date().toISOString(),
                        nextReset: null
                    }
                });
            } catch (error) {
                ctx.logger.error('Failed to get subscription status', error);
                res.status(500).json({ error: 'Failed to get subscription status' });
            }
        }
    );
}
