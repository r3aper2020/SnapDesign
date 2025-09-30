import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

interface TokenBannerProps {
    tokensRemaining: number | null;
    userSubscribed?: boolean | null;
    style?: any;
    shouldShow?: boolean;
    onSubscribe?: () => void; // Callback for subscription button
}

export const TokenBanner: React.FC<TokenBannerProps> = ({
    tokensRemaining,
    userSubscribed,
    style,
    shouldShow = true,
    onSubscribe
}) => {
    const { theme } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-100)).current;
    const [isVisible, setIsVisible] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy < 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50) {
                    // Swipe up to dismiss
                    Animated.timing(translateY, {
                        toValue: -100,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => setIsVisible(false));
                } else {
                    // Reset position
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const isOutOfTokens = tokensRemaining === 0;
    const bannerStyle = isOutOfTokens ? styles.errorBanner : styles.infoBanner;
    const textColor = isOutOfTokens ? '#FF453A' : theme.colors.text.primary;

    const message = isOutOfTokens
        ? userSubscribed
            ? 'Out of tokens. Wait for next reset.'
            : 'Out of tokens. Subscribe to continue.'
        : `${tokensRemaining} design tokens remaining`;

    // Reset visibility when shouldShow changes
    useEffect(() => {
        setIsVisible(shouldShow);
    }, [shouldShow]);

    // Handle animations when visibility changes
    useEffect(() => {
        if (!isVisible) {
            // Fade out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset position and fade in
            translateY.setValue(-100);
            fadeAnim.setValue(0);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [fadeAnim, translateY, isVisible]);

    // Handle modal visibility based on token status
    useEffect(() => {
        if (isOutOfTokens && !userSubscribed && isVisible && shouldShow) {
            setIsModalVisible(true);
            setIsVisible(false);
        }
    }, [isOutOfTokens, userSubscribed, isVisible, shouldShow]);

    if (tokensRemaining === null) return null;
    if (!isVisible && !isModalVisible) return null;

    return (
        <>
            {/* Token Banner */}
            {!isOutOfTokens && (
                <Animated.View
                    style={[
                        styles.container,
                        bannerStyle,
                        style,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY }],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Text style={[styles.bannerText, { color: textColor }]}>
                        {message}
                    </Text>
                    <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={() => {
                            Animated.parallel([
                                Animated.timing(fadeAnim, {
                                    toValue: 0,
                                    duration: 200,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(translateY, {
                                    toValue: -100,
                                    duration: 200,
                                    useNativeDriver: true,
                                }),
                            ]).start(() => setIsVisible(false));
                        }}
                    >
                        <Text style={[styles.dismissText, { color: textColor }]}>✕</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Out of Tokens Modal */}
            <Modal
                visible={isModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.colors.background.secondary }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                                Out of Tokens
                            </Text>
                            <Text style={[styles.modalSubtitle, { color: theme.colors.text.secondary }]}>
                                Subscribe to continue creating amazing designs
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.subscribeButton}
                            onPress={() => {
                                setIsModalVisible(false);
                                onSubscribe?.();
                            }}
                        >
                            <LinearGradient
                                colors={theme.colors.gradient.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.subscribeButtonText}>
                                    Subscribe Now
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setIsModalVisible(false)}
                        >
                            <Text style={[styles.cancelButtonText, { color: theme.colors.text.primary }]}>
                                Maybe Later
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50, // Account for status bar
        backgroundColor: 'rgba(0, 0, 0, 0.85)', // Dark semi-transparent background
    },
    infoBanner: {
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    errorBanner: {
        backgroundColor: 'rgba(255, 59, 48, 0.95)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(0, 0, 0, 0.15)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    bannerText: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    dismissButton: {
        position: 'absolute',
        right: 16,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
    },
    dismissText: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.9,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 24,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.8,
    },
    subscribeButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
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
    subscribeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.8,
    },
});