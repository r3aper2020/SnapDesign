import type { Express, Request, Response, NextFunction } from 'express';
import type { ServiceModule, ServiceContext } from '../../core/types';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import { verifyFirebaseToken } from '../../core/auth';
import * as admin from 'firebase-admin';

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
  subscriptionEndDate?: string | null;
}

export async function checkAndResetTokens(
  userId: string,
  ctx: ServiceContext
): Promise<TokenUsage | null> {
  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.tokenUsage) {
    return null; // No token usage data
  }

  const nextReset = userData.tokenUsage.nextReset ? new Date(userData.tokenUsage.nextReset) : null;
  const now = new Date();

  if (!nextReset || nextReset > now) {
    return userData.tokenUsage; // Not time to reset yet
  }

  // Get current subscription status from RevenueCat
  const subscriber = await getSubscriber(userId);
  if (!subscriber) {
    return userData.tokenUsage; // Keep existing usage if can't get subscription info
  }

  const tier = getSubscriptionTier(subscriber);
  let subscriptionEndDate: string | null = null;

  // Get latest subscription end date
  if (tier !== SubscriptionTier.FREE) {
    const subscriptions = subscriber.subscriber.subscriptions;
    let latestExpiry: Date | null = null;
    for (const [_, subscription] of Object.entries(subscriptions)) {
      const expiryDate = new Date(subscription.expires_date);
      if (!latestExpiry || expiryDate > latestExpiry) {
        latestExpiry = expiryDate;
      }
    }
    if (latestExpiry) {
      subscriptionEndDate = latestExpiry.toISOString();
    }
  }

  // Reset tokens based on tier
  const nextResetDate = new Date(now);
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);

  const newTokenUsage: TokenUsage = {
    tokenRequestCount: getTokensForTier(tier),
    subscriptionTier: tier,
    lastReset: now.toISOString(),
    nextReset: nextResetDate.toISOString(),
    subscriptionEndDate  // Keep track of subscription end date separately
  };

  await db.collection('users').doc(userId).update({
    tokenUsage: newTokenUsage,
    updatedAt: now.toISOString()
  });

  return newTokenUsage;
}

async function updateFirestoreSubscription(
  userId: string,
  tier: SubscriptionTier,
  ctx: ServiceContext,
  subscriber?: RevenueCatSubscriber,
  forceTokenReset: boolean = false
): Promise<void> {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new Error('User not found');
    }

    const now = new Date();

    // Get subscription end date from RevenueCat if available
    let subscriptionEndDate: string | null = null;
    if (subscriber && tier !== SubscriptionTier.FREE) {
      const subscriptions = subscriber.subscriber.subscriptions;
      // Find the active subscription with the latest expiration date
      let latestExpiry: Date | null = null;
      for (const [_, subscription] of Object.entries(subscriptions)) {
        const expiryDate = new Date(subscription.expires_date);
        if (!latestExpiry || expiryDate > latestExpiry) {
          latestExpiry = expiryDate;
        }
      }
      if (latestExpiry) {
        subscriptionEndDate = latestExpiry.toISOString();
      }
    }

    // Determine if tokens should be reset
    let shouldResetTokens = forceTokenReset;
    if (!shouldResetTokens && userData.tokenUsage?.nextReset) {
      const nextReset = new Date(userData.tokenUsage.nextReset);
      shouldResetTokens = nextReset <= now;
    }

    // Calculate token count
    let tokenCount = shouldResetTokens ?
      getTokensForTier(tier) : // Reset to full amount
      (userData.tokenUsage?.tokenRequestCount || getTokensForTier(tier)); // Keep existing count

    const update = {
      tier,
      tokensRemaining: tokenCount,
    };

    // Update user document with subscription info and token usage
    await db.collection('users').doc(userId).update({
      'subscription': {
        ...update,
        subscriptionEndDate
      },
      'tokenUsage': {
        tokenRequestCount: tokenCount,
        subscriptionTier: tier,
        lastReset: shouldResetTokens ? now.toISOString() : (userData.tokenUsage?.lastReset || now.toISOString()),
        nextReset: subscriptionEndDate
      },
      updatedAt: now.toISOString()
    });

    ctx.logger.info('Updated user subscription and tokens', {
      userId,
      tier,
      tokensRemaining: update.tokensRemaining,
      subscriptionEndDate
    });
  } catch (error) {
    ctx.logger.error('Failed to update user subscription', { userId, tier, error });
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

// Load service-scoped .env (server/src/services/revenuecat/.env)
dotenv.config({ path: path.join(__dirname, '.env') });

interface RevenueCatConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
}

interface RevenueCatSubscriber {
  subscriber: {
    original_app_user_id: string;
    subscriptions: {
      [key: string]: {
        expires_date: string;
        product_identifier: string;
      };
    };
  };
}

const PRODUCT_TO_TIER: { [key: string]: SubscriptionTier } = {
  'creator_monthly': SubscriptionTier.CREATOR,
  'professional_monthly': SubscriptionTier.PROFESSIONAL,
  'free_tier': SubscriptionTier.FREE
};

function getRevenueCatConfig(): RevenueCatConfig | null {
  const apiKey = process.env.REVENUECAT_API_KEY;
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    return null;
  }

  return {
    apiKey,
    webhookSecret,
    baseUrl: 'https://api.revenuecat.com/v1'
  };
}

let revenueCatConfig: RevenueCatConfig | null = null;
let revenueCatClient: ReturnType<typeof createRevenueCatClient> | null = null;

function createRevenueCatClient(config: RevenueCatConfig) {
  return axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  });
}

function requireRevenueCat(req: Request, res: Response, next: any) {
  if (!revenueCatConfig || !revenueCatClient) {
    return res.status(503).json({ error: 'RevenueCat service not configured' });
  }
  next();
}

export async function getSubscriber(userId: string): Promise<RevenueCatSubscriber | null> {
  if (!revenueCatClient) return null;

  try {
    const response = await revenueCatClient.get(`/subscribers/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    return null;
  }
}

export function getSubscriptionTier(subscriber: RevenueCatSubscriber): SubscriptionTier {
  const subscriptions = subscriber.subscriber.subscriptions;

  // Check active subscriptions
  for (const [_, subscription] of Object.entries(subscriptions)) {
    const expiresDate = new Date(subscription.expires_date);
    if (expiresDate > new Date()) {
      return PRODUCT_TO_TIER[subscription.product_identifier] || SubscriptionTier.FREE;
    }
  }

  return SubscriptionTier.FREE;
}

const revenueCatService: ServiceModule = {
  name: 'revenuecat',

  async init(ctx: ServiceContext) {
    revenueCatConfig = getRevenueCatConfig();

    ctx.logger.info('Initializing RevenueCat service', {
      hasConfig: !!revenueCatConfig,
      apiKeyPresent: !!process.env.REVENUECAT_API_KEY,
      webhookSecretPresent: !!process.env.REVENUECAT_WEBHOOK_SECRET
    });

    if (revenueCatConfig) {
      revenueCatClient = createRevenueCatClient(revenueCatConfig);
      ctx.logger.info('RevenueCat service initialized successfully');
    } else {
      ctx.logger.warn('RevenueCat service running in stub mode - using mock data', {
        reason: 'Missing env vars',
        required: ['REVENUECAT_API_KEY', 'REVENUECAT_WEBHOOK_SECRET']
      });
    }
  },

  async registerRoutes(app: Express, ctx: ServiceContext) {
    ctx.logger.info('Registering RevenueCat routes', {
      mode: revenueCatConfig ? 'live' : 'stub',
      hasClient: !!revenueCatClient
    });

    // Register stub endpoints first if RevenueCat is not configured
    if (!revenueCatConfig) {
      ctx.logger.info('Registering stub endpoints for testing');

      app.get('/revenuecat/subscribers/:userId', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
        try {
          // Ensure user can only access their own subscription info
          if (!req.user || req.user.uid !== req.params.userId) {
            return res.status(403).json({ error: 'Unauthorized access' });
          }

          // Return mock subscriber data for testing
          res.json({
            subscriber: {
              subscriptions: {
                'mock_sub': {
                  expires_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  product_identifier: 'creator_monthly'
                }
              }
            },
            tier: 'creator',
            active: true,
            tokenUsage: {
              tokenRequestCount: DEFAULT_CREATOR_TOKENS,
              subscriptionTier: SubscriptionTier.CREATOR,
              lastReset: new Date().toISOString(),
              nextReset: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          });
        } catch (error) {
          ctx.logger.error('Failed to get subscriber info in stub mode:', error);
          res.status(500).json({ error: 'Failed to get subscriber info' });
        }
      });

      app.post('/revenuecat/subscriptions/update', (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
        try {
          ctx.logger.info('Stub subscription update requested', { body: req.body });

          // Get user ID from auth token
          const userId = req.user?.uid;
          const { productId } = req.body;

          if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
          }

          if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
          }

          // Initialize Firebase Admin if not already initialized
          if (!admin.apps.length) {
            initializeFirebaseAdmin(ctx);
          }

          const db = admin.firestore();
          const now = new Date();

          // Handle cancellation
          if (productId === 'cancel') {
            // Get current token usage to preserve token count
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const currentTokenCount = userData?.tokenUsage?.tokenRequestCount || DEFAULT_FREE_TOKENS;

            const tokenUsage = {
              tokenRequestCount: currentTokenCount, // Keep current token count
              subscriptionTier: SubscriptionTier.FREE, // Move to free tier
              lastReset: userData?.tokenUsage?.lastReset || now.toISOString(), // Keep last reset date
              nextReset: userData?.tokenUsage?.nextReset || new Date(now.setMonth(now.getMonth() + 1)).toISOString(), // Keep next reset date
              subscriptionEndDate: now.toISOString() // Mark when subscription ended
            };

            await db.collection('users').doc(userId).update({
              'tokenUsage': tokenUsage,
              updatedAt: now.toISOString()
            });

            ctx.logger.info('Cancelled subscription in stub mode', {
              userId,
              tokenUsage
            });

            return res.json({
              success: true,
              tier: 'free',
              subscriber: {
                subscriptions: {} // Empty subscriptions means cancelled
              },
              tokenUsage
            });
          }

          // Handle subscription update
          const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

          // Update user's subscription in Firestore
          const tokenUsage = {
            tokenRequestCount: DEFAULT_CREATOR_TOKENS,
            subscriptionTier: SubscriptionTier.CREATOR,
            lastReset: now.toISOString(),
            nextReset: expiryDate.toISOString(),
            subscriptionEndDate: expiryDate.toISOString()
          };

          await db.collection('users').doc(userId).update({
            'tokenUsage': tokenUsage,
            updatedAt: now.toISOString()
          });

          ctx.logger.info('Updated user subscription in stub mode', {
            userId,
            tokenUsage
          });

          // Return mock subscription update response
          res.json({
            success: true,
            tier: 'creator',
            subscriber: {
              subscriptions: {
                'mock_sub': {
                  expires_date: expiryDate.toISOString(),
                  product_identifier: 'creator_monthly'
                }
              }
            },
            tokenUsage
          });
        } catch (error) {
          ctx.logger.error('Failed to update subscription in stub mode:', error);
          res.status(500).json({ error: 'Failed to update subscription' });
        }
      });

      app.post('/revenuecat/webhooks', (_req, res) => {
        res.json({ success: true, message: 'Webhook received (stub mode)' });
      });

      return; // Don't register the real endpoints
    }

    // GET /revenuecat/health - Service health check
    app.get('/revenuecat/health', (_req, res) => {
      res.json({
        service: 'revenuecat',
        status: revenueCatConfig ? 'healthy' : 'stub',
        version: '1.0.0',
        endpoints: {
          subscriptions: ['/revenuecat/subscribers/:userId', '/revenuecat/subscriptions/update'],
          webhooks: ['/revenuecat/webhooks']
        }
      });
    });

    // GET /revenuecat/subscribers/:userId - Get subscriber info
    app.get('/revenuecat/subscribers/:userId', requireRevenueCat, (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        // Ensure user can only access their own subscription info
        if (!req.user || req.user.uid !== req.params.userId) {
          return res.status(403).json({ error: 'Unauthorized access' });
        }

        // Check and reset tokens if needed
        await checkAndResetTokens(req.params.userId, ctx);

        const subscriber = await getSubscriber(req.params.userId);
        if (!subscriber) {
          return res.status(404).json({ error: 'Subscriber not found' });
        }

        const tier = getSubscriptionTier(subscriber);

        // Update Firestore with current subscription info and RevenueCat data
        await updateFirestoreSubscription(req.params.userId, tier, ctx, subscriber);

        // Get updated token usage from Firestore
        const userDoc = await admin.firestore().collection('users').doc(req.params.userId).get();
        const userData = userDoc.data();

        res.json({
          subscriber,
          tier,
          active: tier !== SubscriptionTier.FREE,
          tokenUsage: userData?.tokenUsage || {
            tokenRequestCount: getTokensForTier(tier),
            subscriptionTier: tier,
            lastReset: new Date().toISOString(),
            nextReset: null
          }
        });
      } catch (err) {
        ctx.logger.error('RevenueCat get subscriber failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /revenuecat/subscriptions/update - Update subscription
    app.post('/revenuecat/subscriptions/update', requireRevenueCat, (req, res, next) => verifyFirebaseToken(req, res, next, ctx), async (req, res) => {
      try {
        ctx.logger.info('Subscription update request', {
          headers: req.headers,
          body: req.body,
          user: req.user
        });

        // Use authenticated user's ID from the token
        const userId = req.user?.uid;
        const { productId } = req.body;

        if (!userId || !productId) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const subscriber = await getSubscriber(userId);
        if (!subscriber) {
          return res.status(404).json({ error: 'Subscriber not found' });
        }

        // Update subscription in RevenueCat
        if (!revenueCatClient) {
          return res.status(503).json({ error: 'RevenueCat client not initialized' });
        }

        await revenueCatClient.post(`/subscribers/${userId}/subscriptions`, {
          product_id: productId
        });

        // Get updated subscriber info
        const updatedSubscriber = await getSubscriber(userId);
        if (!updatedSubscriber) {
          return res.status(500).json({ error: 'Failed to get updated subscriber info' });
        }

        const tier = getSubscriptionTier(updatedSubscriber);

        // Update Firestore with new subscription info and RevenueCat data
        await updateFirestoreSubscription(userId, tier, ctx, updatedSubscriber);

        // Get updated token usage from Firestore
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();

        res.json({
          success: true,
          tier,
          subscriber: updatedSubscriber,
          tokenUsage: userData?.tokenUsage
        });
      } catch (err) {
        ctx.logger.error('RevenueCat update subscription failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Verify RevenueCat webhook signature
    function verifyWebhookSignature(req: Request, res: Response, next: NextFunction) {
      if (!revenueCatConfig) {
        return res.status(503).json({ error: 'RevenueCat service not configured' });
      }

      const signature = req.header('X-RevenueCat-Signature');
      if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      // TODO: Implement signature verification using revenueCatConfig.webhookSecret
      // For now, we'll just check if the signature exists
      next();
    }

    // POST /revenuecat/webhooks - Handle RevenueCat webhooks
    app.post('/revenuecat/webhooks', requireRevenueCat, verifyWebhookSignature, async (req, res) => {
      try {
        const event = req.body;
        const userId = event.app_user_id;

        if (!userId) {
          return res.status(400).json({ error: 'Missing app_user_id in webhook' });
        }

        // Get current subscriber info
        const subscriber = await getSubscriber(userId);
        if (!subscriber) {
          return res.status(404).json({ error: 'Subscriber not found' });
        }

        const tier = getSubscriptionTier(subscriber);

        // Update Firestore with new subscription info and RevenueCat data
        await updateFirestoreSubscription(userId, tier, ctx, subscriber);

        // Get updated token usage from Firestore
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();

        res.json({
          success: true,
          tier,
          event,
          tokenUsage: userData?.tokenUsage
        });
      } catch (err) {
        ctx.logger.error('RevenueCat webhook failed', err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // No need for stub endpoints here - they're registered at the top if needed
  }
};

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin(ctx: ServiceContext) {
  if (!admin.apps.length) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
    }
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    ctx.logger.info('Firebase Admin SDK initialized');
  }
}

export default revenueCatService;
