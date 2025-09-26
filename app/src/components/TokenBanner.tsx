import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface TokenBannerProps {
    tokensRemaining: number | null;
    tokenResetDate: Date | null;
    style?: any;
}

export const TokenBanner: React.FC<TokenBannerProps> = ({
    tokensRemaining,
    tokenResetDate,
    style
}) => {
    const { theme } = useTheme();

    if (!tokensRemaining && !tokenResetDate) return null;

    const isOutOfTokens = tokensRemaining === 0;
    const bannerStyle = isOutOfTokens ? styles.errorBanner : styles.infoBanner;
    const textColor = isOutOfTokens ? '#FF453A' : theme.colors.text.primary;

    let message = '';
    if (isOutOfTokens && tokenResetDate) {
        const formattedDate = tokenResetDate.toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        message = `Out of tokens. Next reset: ${formattedDate}`;
    } else if (tokensRemaining !== null) {
        message = `${tokensRemaining} design tokens remaining`;
    }

    return (
        <View style={[bannerStyle, style]}>
            <Text style={[styles.bannerText, { color: textColor }]}>
                {message}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    infoBanner: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    errorBanner: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
    },
    bannerText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
