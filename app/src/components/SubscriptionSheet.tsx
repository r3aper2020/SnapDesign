import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    ScrollView,
    Alert,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { subscriptionService } from '../services';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '../types/subscription';

const { width } = Dimensions.get('window');

interface SubscriptionSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    currentTier?: SubscriptionTier;
    onCancelSubscription?: () => void;
    tokensRemaining?: number;
    onDowngrade?: () => void;
}

export const SubscriptionSheet: React.FC<SubscriptionSheetProps> = ({
    visible,
    onClose,
    onSuccess,
    currentTier = SubscriptionTier.FREE,
    onCancelSubscription,
    onDowngrade,
    tokensRemaining = 0,
}) => {
    const { theme } = useTheme();
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [prorateInfo, setProrateInfo] = useState<{
        proratedPrice: number;
        nextMonthPrice: number;
        daysRemaining: number;
    } | null>(null);

    // Fetch pro-rated price when component mounts or tier is selected
    useEffect(() => {
        const fetchProrateInfo = async () => {
            if (currentTier === SubscriptionTier.CREATOR &&
                (selectedTier === SubscriptionTier.PROFESSIONAL || !selectedTier)) {
                try {
                    const info = await subscriptionService.getProratedPrice(SubscriptionTier.PROFESSIONAL);
                    setProrateInfo({
                        proratedPrice: info.proratedPrice,
                        nextMonthPrice: info.nextMonthPrice,
                        daysRemaining: info.daysRemaining
                    });
                } catch (error) {
                    console.error('Failed to get pro-rated price:', error);
                    setProrateInfo(null);
                }
            } else {
                setProrateInfo(null);
            }
        };

        fetchProrateInfo();
    }, [selectedTier, currentTier]);

    const handlePurchase = async () => {
        if (!selectedTier) return;

        setIsPurchasing(true);
        try {
            await subscriptionService.updateSubscription(selectedTier);
            Alert.alert('Success', 'Thank you for subscribing!');
            onSuccess?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to complete purchase. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
                    {/* Header */}
                    <LinearGradient
                        colors={theme.colors.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Text style={styles.title}>Design Tokens</Text>
                        <Text style={styles.subtitle}>
                            Current Plan: {SUBSCRIPTION_PLANS[currentTier].name}{'\n'}
                            {tokensRemaining} / {SUBSCRIPTION_PLANS[currentTier].tokensPerMonth} tokens remaining
                        </Text>
                    </LinearGradient>

                    {/* Content */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {[SubscriptionTier.CREATOR, SubscriptionTier.PROFESSIONAL].map((tier) => (
                            <TouchableOpacity
                                key={tier}
                                style={[
                                    styles.packageCard,
                                    {
                                        backgroundColor: theme.colors.background.primary,
                                        borderColor: selectedTier === tier
                                            ? theme.colors.primary.main
                                            : tier === currentTier
                                                ? theme.colors.accent.purple
                                                : 'rgba(255, 255, 255, 0.1)',
                                    },
                                ]}
                                onPress={tier === currentTier ? undefined : () => setSelectedTier(tier)}
                                disabled={tier === currentTier}
                                activeOpacity={tier === currentTier ? 1 : 0.8}
                            >
                                {tier === currentTier && (
                                    <View style={[styles.currentPlanBadge, { backgroundColor: theme.colors.accent.purple }]}>
                                        <Text style={styles.currentPlanText}>Current Plan</Text>
                                    </View>
                                )}
                                <Text style={[styles.packageTitle, { color: theme.colors.text.primary }]}>
                                    {SUBSCRIPTION_PLANS[tier].name}
                                </Text>
                                <Text style={[styles.packageTokens, { color: theme.colors.primary.main }]}>
                                    Up to {SUBSCRIPTION_PLANS[tier].tokensPerMonth} Tokens
                                </Text>
                                {currentTier === SubscriptionTier.CREATOR && tier === SubscriptionTier.PROFESSIONAL && prorateInfo ? (
                                    // Show pro-rated price for upgrade
                                    <View>
                                        <Text style={[styles.packagePrice, { color: theme.colors.text.primary }]}>
                                            ${prorateInfo.proratedPrice.toFixed(2)}
                                        </Text>
                                        <Text style={[styles.originalPrice, { color: theme.colors.text.secondary, textDecorationLine: 'line-through' }]}>
                                            ${SUBSCRIPTION_PLANS[tier].price.toFixed(2)}
                                        </Text>
                                        <Text style={[styles.proratedLabel, { color: theme.colors.accent.purple }]}>
                                            Pro-rated for {prorateInfo.daysRemaining} days
                                        </Text>
                                        <Text style={[styles.packagePeriod, { color: theme.colors.text.secondary }]}>
                                            then ${prorateInfo.nextMonthPrice.toFixed(2)}/month
                                        </Text>
                                    </View>
                                ) : (
                                    // Show regular price
                                    <View>
                                        <Text style={[styles.packagePrice, { color: theme.colors.text.primary }]}>
                                            ${SUBSCRIPTION_PLANS[tier].price.toFixed(2)}
                                        </Text>
                                        <Text style={[styles.packagePeriod, { color: theme.colors.text.secondary }]}>
                                            per month
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.features}>
                                    <Text style={[styles.feature, { color: theme.colors.text.secondary }]}>
                                        ✓ Up to {SUBSCRIPTION_PLANS[tier].tokensPerMonth} design tokens monthly
                                    </Text>
                                    <Text style={[styles.feature, { color: theme.colors.text.secondary }]}>
                                        ✓ Token rollover
                                    </Text>
                                    <Text style={[styles.feature, { color: theme.colors.text.secondary }]}>
                                        ✓ Priority support
                                    </Text>
                                    {tier === SubscriptionTier.PROFESSIONAL && (
                                        <Text style={[styles.feature, { color: theme.colors.text.secondary }]}>
                                            ✓ Early access to new features
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        {/* Show different buttons based on subscription state */}
                        {currentTier === SubscriptionTier.FREE ? (
                            // Free tier - show subscribe button
                            <TouchableOpacity
                                style={[
                                    styles.subscribeButton,
                                    { opacity: (!selectedTier || isPurchasing) ? 0.5 : 1 },
                                ]}
                                onPress={handlePurchase}
                                disabled={!selectedTier || isPurchasing}
                            >
                                <LinearGradient
                                    colors={theme.colors.gradient.primary}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    {isPurchasing ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.buttonText}>Subscribe Now</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : currentTier === SubscriptionTier.CREATOR ? (
                            // Creator tier - show upgrade button and cancel
                            <>
                                {selectedTier === SubscriptionTier.PROFESSIONAL && (
                                    <TouchableOpacity
                                        style={[
                                            styles.subscribeButton,
                                            { opacity: isPurchasing ? 0.5 : 1 },
                                        ]}
                                        onPress={handlePurchase}
                                        disabled={isPurchasing}
                                    >
                                        <LinearGradient
                                            colors={theme.colors.gradient.primary}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.gradientButton}
                                        >
                                            {isPurchasing ? (
                                                <ActivityIndicator color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.buttonText}>Upgrade Now</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.cancelButton, { borderColor: theme.colors.error.main }]}
                                    onPress={onCancelSubscription}
                                    disabled={isPurchasing}
                                >
                                    <Text style={[styles.cancelText, { color: theme.colors.error.main }]}>
                                        Cancel Subscription
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : currentTier === SubscriptionTier.PROFESSIONAL ? (
                            // Professional tier - show downgrade and cancel
                            <>
                                <TouchableOpacity
                                    style={[styles.downgradeButton, { borderColor: theme.colors.accent.purple }]}
                                    onPress={onDowngrade}
                                    disabled={isPurchasing}
                                >
                                    <Text style={[styles.downgradeText, { color: theme.colors.accent.purple }]}>
                                        Downgrade to Creator at Next Reset
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { borderColor: theme.colors.error.main }]}
                                    onPress={onCancelSubscription}
                                    disabled={isPurchasing}
                                >
                                    <Text style={[styles.cancelText, { color: theme.colors.error.main }]}>
                                        Cancel Subscription
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : null}

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            disabled={isPurchasing}
                        >
                            <Text style={[styles.closeText, { color: theme.colors.text.primary }]}>
                                {currentTier === SubscriptionTier.FREE ? 'Maybe Later' : 'Close'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    originalPrice: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    proratedLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    downgradeButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        marginBottom: 12,
    },
    downgradeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    currentPlanBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    currentPlanText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    packageTokens: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        marginBottom: 12,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 24,
    },
    header: {
        padding: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },
    packageCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
    },
    packageTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    packagePrice: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 4,
    },
    packagePeriod: {
        fontSize: 14,
        marginBottom: 16,
    },
    features: {
        gap: 8,
    },
    feature: {
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        gap: 12,
    },
    subscribeButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    gradientButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    restoreButton: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    restoreText: {
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    closeText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
