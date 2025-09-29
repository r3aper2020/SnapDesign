import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

const { width } = Dimensions.get('window');

interface SubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSubscribe: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    visible,
    onClose,
    onSubscribe,
}) => {
    const { theme } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.background.secondary }]}>
                    {/* Header */}
                    <LinearGradient
                        colors={theme.colors.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Image
                            source={require('../../assets/re-vibe.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Unlock Unlimited Designs</Text>
                        <Text style={styles.subtitle}>Transform your space without limits</Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={[styles.message, { color: theme.colors.text.primary }]}>
                            You're out of design tokens. Subscribe to get unlimited access to all our AI-powered design features.
                        </Text>

                        {/* Features */}
                        <View style={styles.features}>
                            <View style={styles.featureItem}>
                                <Text style={[styles.featureText, { color: theme.colors.text.primary }]}>
                                    ✨ Unlimited AI designs
                                </Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Text style={[styles.featureText, { color: theme.colors.text.primary }]}>
                                    🎨 All design services included
                                </Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Text style={[styles.featureText, { color: theme.colors.text.primary }]}>
                                    💫 Priority processing
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.button, styles.subscribeButton]}
                            onPress={onSubscribe}
                        >
                            <LinearGradient
                                colors={theme.colors.gradient.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.buttonText}>Subscribe Now</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.background.primary }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.buttonText, { color: theme.colors.text.primary }]}>
                                Maybe Later
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width - 40,
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 24,
    },
    header: {
        padding: 24,
        alignItems: 'center',
    },
    logo: {
        width: 80,
        height: 40,
        marginBottom: 16,
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
    content: {
        padding: 24,
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 24,
    },
    features: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        fontWeight: '600',
    },
    buttons: {
        padding: 24,
        gap: 12,
    },
    button: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    subscribeButton: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    gradientButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
