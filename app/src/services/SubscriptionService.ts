import { apiService } from './';
import { endpoints } from '../config/api';
import { SubscriptionTier } from '../types/subscription';

interface SubscriptionStatus {
    tier: SubscriptionTier;
    tokensRemaining: number;
    nextReset: string | null;
}

class SubscriptionService {
    public async getStatus(): Promise<SubscriptionStatus> {
        try {
            const response = await apiService.get<{
                tokenUsage: {
                    subscriptionTier: SubscriptionTier;
                    tokenRequestCount: number;
                    nextReset: string | null;
                };
            }>(endpoints.subscription.status());

            return {
                tier: response.tokenUsage.subscriptionTier,
                tokensRemaining: response.tokenUsage.tokenRequestCount,
                nextReset: response.tokenUsage.nextReset
            };
        } catch (error) {
            console.error('Failed to get subscription status:', error);
            return {
                tier: SubscriptionTier.FREE,
                tokensRemaining: 10,
                nextReset: null
            };
        }
    }

    public async updateSubscription(tier: SubscriptionTier): Promise<void> {
        try {
            await apiService.post(endpoints.subscription.update(), { tier });
        } catch (error) {
            console.error('Failed to update subscription:', error);
            throw error;
        }
    }

    public async cancelSubscription(): Promise<void> {
        try {
            await this.updateSubscription(SubscriptionTier.FREE);
        } catch (error) {
            console.error('Failed to cancel subscription:', error);
            throw error;
        }
    }
}

export const subscriptionService = new SubscriptionService();
