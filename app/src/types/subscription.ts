export enum SubscriptionTier {
    FREE = 'free',
    CREATOR = 'creator',
    PROFESSIONAL = 'professional'
}

export interface SubscriptionDetails {
    tier: SubscriptionTier;
    name: string;
    tokensPerMonth: number;
    price: number;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionDetails> = {
    [SubscriptionTier.FREE]: {
        tier: SubscriptionTier.FREE,
        name: 'Free Plan',
        tokensPerMonth: 10,
        price: 0
    },
    [SubscriptionTier.CREATOR]: {
        tier: SubscriptionTier.CREATOR,
        name: 'Creator Plan',
        tokensPerMonth: 50,
        price: 4.99
    },
    [SubscriptionTier.PROFESSIONAL]: {
        tier: SubscriptionTier.PROFESSIONAL,
        name: 'Professional Plan',
        tokensPerMonth: 125,
        price: 10.99
    }
};
