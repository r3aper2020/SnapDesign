import { apiService } from './';
import { endpoints } from '../config/api';
import { SubscriptionTier } from '../types/subscription';

interface SubscriptionStatus {
    tier: SubscriptionTier;
    tokensRemaining: number;
    nextReset: string | null;
    isActive: boolean;
    nextTier?: SubscriptionTier | null;  // The tier to transition to at next reset
}

interface ProrateInfo {
    proratedPrice: number;
    nextMonthPrice: number;
    daysRemaining: number;
    currentTokens: number;
    targetTokens: number;
    nextReset: string | null;
}

interface RevenueCatSubscriber {
    subscriber: {
        subscriptions: {
            [key: string]: {
                expires_date: string;
                product_identifier: string;
            };
        };
    };
    tier: SubscriptionTier;
    active: boolean;
}

class SubscriptionService {
    private static instance: SubscriptionService;
    private userId: string | null = null;

    private constructor() { }

    public static getInstance(): SubscriptionService {
        if (!SubscriptionService.instance) {
            SubscriptionService.instance = new SubscriptionService();
        }
        return SubscriptionService.instance;
    }

    public setUserId(userId: string) {
        this.userId = userId;
    }

    public async getStatus(): Promise<SubscriptionStatus> {
        try {
            if (!this.userId) {
                throw new Error('User ID not set');
            }

            const response = await apiService.get<RevenueCatSubscriber>(
                endpoints.subscription.status(this.userId)
            );

            // Get token usage from auth/me endpoint
            const authResponse = await apiService.get<{
                tokens: {
                    remaining: number;
                    lastReset: string;
                    nextReset: string;
                    subscriptionTier: SubscriptionTier;
                    nextTier?: SubscriptionTier | null;
                };
            }>(endpoints.auth.me());

            return {
                tier: response.tier,
                tokensRemaining: authResponse.tokens.remaining,
                nextReset: authResponse.tokens.nextReset,
                isActive: response.active,
                nextTier: authResponse.tokens.nextTier || null
            };
        } catch (error) {
            console.error('Failed to get subscription status:', error);
            return {
                tier: SubscriptionTier.FREE,
                tokensRemaining: 10,
                nextReset: null,
                isActive: false,
                nextTier: null
            };
        }
    }

    // Product IDs must match exactly what's configured in RevenueCat
    private readonly TIER_TO_PRODUCT: Record<SubscriptionTier, string> = {
        [SubscriptionTier.FREE]: 'free_tier',
        [SubscriptionTier.CREATOR]: 'creator_monthly',
        [SubscriptionTier.PROFESSIONAL]: 'professional_monthly'
    };

    private getProductIdForTier(tier: SubscriptionTier): string {
        const productId = this.TIER_TO_PRODUCT[tier];
        if (!productId) {
            throw new Error(`No product ID configured for tier: ${tier}`);
        }
        return productId;
    }

    public async updateSubscription(tierOrProductId: SubscriptionTier | string): Promise<void> {
        try {
            if (!this.userId) {
                throw new Error('User ID not set');
            }

            // Special cases for cancellation and downgrade
            if (tierOrProductId === 'cancel') {
                await apiService.post(endpoints.subscription.update(), { productId: 'cancel' });
                return;
            } else if (tierOrProductId === 'downgrade') {
                await apiService.post(endpoints.subscription.update(), { productId: 'downgrade_to_creator' });
                return;
            }

            // Always convert to tier and then get product ID
            const tier = typeof tierOrProductId === 'string'
                ? Object.values(SubscriptionTier).find(t => t === tierOrProductId) || SubscriptionTier.FREE
                : tierOrProductId;

            const productId = this.getProductIdForTier(tier);
            await apiService.post(endpoints.subscription.update(), { productId });

            // Refresh token usage after subscription update
            await this.getStatus();
        } catch (error) {
            console.error('Failed to update subscription:', error);
            throw error;
        }
    }

    public async cancelSubscription(): Promise<void> {
        try {
            if (!this.userId) {
                throw new Error('User ID not set');
            }

            // Use a special product ID for cancellation
            await this.updateSubscription('cancel');
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }

    public async getProratedPrice(targetTier: SubscriptionTier): Promise<ProrateInfo> {
        try {
            if (!this.userId) {
                throw new Error('User ID not set');
            }

            const response = await apiService.get<ProrateInfo>(
                endpoints.subscription.prorate(this.userId, targetTier)
            );

            return response;
        } catch (error) {
            console.error('Failed to get pro-rated price:', error);
            throw error;
        }
    }
}

export const subscriptionService = SubscriptionService.getInstance();
