import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { SubscriptionSheet } from '../components';

export const ManageSubscriptionScreen = () => {
    const { theme } = useTheme();
    const [isSubscriptionSheetVisible, setIsSubscriptionSheetVisible] = useState(false);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
            {/* Background Image */}
            <Image
                source={require('../../assets/background.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                        Subscription Management
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                        Unlock unlimited access to AI-powered designs
                    </Text>
                </View>

                {/* Subscription Button */}
                <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => setIsSubscriptionSheetVisible(true)}
                >
                    <LinearGradient
                        colors={theme.colors.gradient.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                    >
                        <Text style={styles.buttonText}>View Subscription Plans</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Subscription Sheet */}
                <SubscriptionSheet
                    visible={isSubscriptionSheetVisible}
                    onClose={() => setIsSubscriptionSheetVisible(false)}
                    onSuccess={() => setIsSubscriptionSheetVisible(false)}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        maxWidth: '80%',
        lineHeight: 22,
    },
    subscribeButton: {
        width: '100%',
        maxWidth: 300,
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
});