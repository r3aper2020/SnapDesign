import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TokenBanner, SubscriptionSheet } from '../components';
import { apiService } from '../services';
import { endpoints } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
type ServiceSelectionNavigationProp = StackNavigationProp<RootStackParamList, 'ServiceSelection'>;

interface ServiceSelectionProps {
  navigation: ServiceSelectionNavigationProp;
}

// ============================================================================
// SERVICE OPTIONS
// ============================================================================
// Custom Icon Components
const DesignIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.6,
      borderRadius: size * 0.1,
      backgroundColor: color,
      position: 'relative',
    }}>
      {/* Palette circles */}
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.15,
        width: size * 0.15,
        height: size * 0.15,
        borderRadius: size * 0.075,
        backgroundColor: '#FF6B6B',
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        right: size * 0.15,
        width: size * 0.15,
        height: size * 0.15,
        borderRadius: size * 0.075,
        backgroundColor: '#4ECDC4',
      }} />
      <View style={{
        position: 'absolute',
        bottom: size * 0.1,
        left: size * 0.4,
        width: size * 0.15,
        height: size * 0.15,
        borderRadius: size * 0.075,
        backgroundColor: '#45B7D1',
      }} />
      {/* Brush handle */}
      <View style={{
        position: 'absolute',
        top: -size * 0.2,
        right: -size * 0.1,
        width: size * 0.05,
        height: size * 0.4,
        backgroundColor: color,
        borderRadius: size * 0.025,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  </View>
);

const OrganizeIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.7,
      height: size * 0.7,
      position: 'relative',
    }}>
      {/* Main container */}
      <View style={{
        width: size * 0.6,
        height: size * 0.6,
        borderRadius: size * 0.1,
        backgroundColor: color,
        position: 'absolute',
        top: size * 0.05,
        left: size * 0.05,
      }} />
      {/* Organized items */}
      <View style={{
        position: 'absolute',
        top: size * 0.15,
        left: size * 0.15,
        width: size * 0.3,
        height: size * 0.05,
        backgroundColor: '#FF6B6B',
        borderRadius: size * 0.025,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.25,
        left: size * 0.15,
        width: size * 0.25,
        height: size * 0.05,
        backgroundColor: '#4ECDC4',
        borderRadius: size * 0.025,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.35,
        left: size * 0.15,
        width: size * 0.2,
        height: size * 0.05,
        backgroundColor: '#45B7D1',
        borderRadius: size * 0.025,
      }} />
      {/* Checkmark */}
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        right: size * 0.1,
        width: size * 0.15,
        height: size * 0.15,
        borderWidth: 2,
        borderColor: '#4ECDC4',
        borderRadius: size * 0.075,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          width: size * 0.05,
          height: size * 0.08,
          borderBottomWidth: 2,
          borderRightWidth: 2,
          borderColor: '#4ECDC4',
          transform: [{ rotate: '45deg' }],
          marginTop: -size * 0.02,
        }} />
      </View>
    </View>
  </View>
);

const MakeoverIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.8,
      position: 'relative',
    }}>
      {/* House base */}
      <View style={{
        width: size * 0.6,
        height: size * 0.4,
        backgroundColor: color,
        position: 'absolute',
        bottom: 0,
        left: size * 0.1,
        borderRadius: size * 0.05,
      }} />
      {/* Roof */}
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.4,
        borderRightWidth: size * 0.4,
        borderBottomWidth: size * 0.3,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        position: 'absolute',
        top: 0,
        left: 0,
      }} />
      {/* Door */}
      <View style={{
        width: size * 0.15,
        height: size * 0.2,
        backgroundColor: '#8B4513',
        position: 'absolute',
        bottom: 0,
        left: size * 0.225,
        borderRadius: size * 0.02,
      }} />
      {/* Windows */}
      <View style={{
        width: size * 0.1,
        height: size * 0.1,
        backgroundColor: '#87CEEB',
        position: 'absolute',
        top: size * 0.1,
        left: size * 0.15,
        borderRadius: size * 0.02,
      }} />
      <View style={{
        width: size * 0.1,
        height: size * 0.1,
        backgroundColor: '#87CEEB',
        position: 'absolute',
        top: size * 0.1,
        right: size * 0.15,
        borderRadius: size * 0.02,
      }} />
      {/* Sparkle effect */}
      <View style={{
        position: 'absolute',
        top: -size * 0.1,
        right: -size * 0.05,
        width: size * 0.1,
        height: size * 0.1,
        backgroundColor: '#FFD700',
        borderRadius: size * 0.05,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  </View>
);

const ArrowIcon = ({ size = 18, color = '#FFFFFF' }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.8,
      height: size * 0.3,
      position: 'relative',
    }}>
      {/* Arrow shaft */}
      <View style={{
        width: size * 0.6,
        height: size * 0.08,
        backgroundColor: color,
        position: 'absolute',
        top: size * 0.11,
        left: 0,
        borderRadius: size * 0.04,
      }} />
      {/* Arrow head */}
      <View style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.15,
        borderBottomWidth: size * 0.15,
        borderLeftWidth: size * 0.3,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
        position: 'absolute',
        right: 0,
        top: 0,
      }} />
    </View>
  </View>
);

const serviceOptions = [
  {
    id: 'design',
    title: 'AI Design',
    subtitle: 'Transform your space',
    description: 'Upload a photo and describe your vision. Get a complete room transformation with curated product recommendations.',
    icon: DesignIcon,
    iconColor: '#FF6B6B',
    circleColor: '#2C2C2C',
    gradient: ['#667eea', '#764ba2'] as const,
    features: ['Product Recommendations', 'Style Matching', 'Color Coordination'],
  },
  {
    id: 'declutter',
    title: 'Clean & Organize',
    subtitle: 'Declutter your space',
    description: 'Take a photo of a messy space and get a personalized step-by-step guide to clean and organize it perfectly.',
    icon: OrganizeIcon,
    iconColor: '#4ECDC4',
    circleColor: '#2C2C2C',
    gradient: ['#f093fb', '#f5576c'] as const,
    features: ['Step-by-Step Guide', 'Time Estimates', 'Organization Tips'],
  },
  {
    id: 'makeover',
    title: 'Complete Makeover',
    subtitle: 'Full transformation',
    description: 'Get a complete room makeover combining design, organization, and styling for the ultimate transformation.',
    icon: MakeoverIcon,
    iconColor: '#45B7D1',
    circleColor: '#2C2C2C',
    gradient: ['#4facfe', '#00f2fe'] as const,
    features: ['Design + Organization', 'Complete Planning', 'Style Guide'],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const ServiceSelectionScreen: React.FC<ServiceSelectionProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  // State for token usage and subscription modal
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [userSubscribed, setUserSubscribed] = useState<boolean | null>(null);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchTokenUsage = async () => {
    try {
      if (!isAuthenticated) {
        // Guests: don't fetch auth-protected endpoint
        setTokensRemaining(null);
        setUserSubscribed(null);
        return;
      }
      interface AuthMeResponse {
        tokens: {
          remaining: number;
          subscribed: boolean;
        };
      }
      const response = await apiService.get<AuthMeResponse>(endpoints.auth.me());
      if (response.tokens) {
        setTokensRemaining(response.tokens.remaining);
        setUserSubscribed(response.tokens.subscribed);
      }
    } catch (error) {
      console.warn('Failed to fetch token usage:', error);
    }
  };

  // Fetch token usage when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setShowBanner(true);
      fetchTokenUsage();
    }, [isAuthenticated])
  );

  const handleServiceSelect = (serviceId: string) => {
    console.log('Service selected:', serviceId);
    // Do not gate here; gating happens at Generate button
    navigateToService(serviceId);
  };

  const navigateToService = (serviceId: string) => {
    try {
      switch (serviceId) {
        case 'design':
          navigation.getParent()?.navigate('Design');
          break;
        case 'declutter':
          navigation.getParent()?.navigate('Declutter');
          break;
        case 'makeover':
          navigation.getParent()?.navigate('Makeover');
          break;
        default:
          console.log('Unknown service selected');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSubscribeSuccess = async () => {
    // Refresh token usage after successful subscription
    try {
      interface AuthMeResponse {
        tokens: {
          remaining: number;
          subscribed: boolean;
        };
      }
      const response = await apiService.get<AuthMeResponse>(endpoints.auth.me());
      if (response.tokens) {
        setTokensRemaining(response.tokens.remaining);
        setUserSubscribed(response.tokens.subscribed);
      }
    } catch (error) {
      console.error('Failed to refresh token usage:', error);
    }
    setIsSubscriptionModalVisible(false);
  };

  const renderServiceCard = (service: typeof serviceOptions[0], index: number) => (
    <Animated.View
      key={service.id}
      style={[
        styles.serviceCardContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => handleServiceSelect(service.id)}
        activeOpacity={0.85}
        accessibilityLabel={`Select ${service.title} service`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={service.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.serviceCardGradient}
        >
          {/* Decorative elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          <View style={styles.serviceCardContent}>
            <View style={styles.serviceHeader}>
              <View style={[styles.serviceIconContainer, { backgroundColor: service.circleColor }]}>
                <service.icon size={24} color={service.iconColor} />
              </View>
              <View style={[styles.serviceArrow, { backgroundColor: '#2C2C2C' }]}>
                <ArrowIcon size={18} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.serviceTextContainer}>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {service.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureTag}>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background.primary} />

      {/* Background Image */}
      <Image
        source={require('../../assets/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={styles.content}>
        {/* Token Banner */}
        {isAuthenticated && (
          <TokenBanner
            tokensRemaining={tokensRemaining}
            userSubscribed={userSubscribed}
            shouldShow={showBanner}
            onSubscribe={() => setIsSubscriptionModalVisible(true)}
          />
        )}

        {/* Subscription Sheet */}
        <SubscriptionSheet
          visible={isSubscriptionModalVisible}
          onClose={() => setIsSubscriptionModalVisible(false)}
          onSuccess={handleSubscribeSuccess}
          tokensRemaining={tokensRemaining || 0}
        />

        {/* Header Section */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/re-vibe.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Choose Your Service
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Transform your space with AI-powered solutions
          </Text>
        </Animated.View>

        {/* Service Options */}
        <View style={styles.servicesContainer}>
          {serviceOptions.map((service, index) => renderServiceCard(service, index))}
        </View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.footerText, { color: theme.colors.text.secondary }]}>
            ✨ All services use AI to analyze your space and provide personalized recommendations
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================
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
    width: width,
    height: height,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logo: {
    width: 70,
    height: 35,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
    maxWidth: width - 60,
    fontWeight: '500',
  },
  servicesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    justifyContent: 'center',
  },
  serviceCardContainer: {
    marginBottom: 8,
  },
  serviceCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  serviceCardGradient: {
    padding: 20,
    minHeight: 140,
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  serviceCardContent: {
    flex: 1,
    zIndex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  serviceSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
    marginBottom: 10,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
  },
});
