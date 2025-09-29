import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StyleSheet,
  Image,
  FlatList,
  Animated,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { designStorage, SavedDesign } from '../services/DesignStorage';
import { TokenBanner } from '../components/TokenBanner';

const { width, height } = Dimensions.get('window');

// Clean, minimal icon components using MaterialIcons
const CameraIcon = ({ size = 24, color = '#666' }) => (
  <MaterialIcons name="camera-alt" size={size} color={color} />
);

const SparkleIcon = ({ size = 24, color = '#666' }) => (
  <MaterialIcons name="auto-awesome" size={size} color={color} />
);

const MagicWandIcon = ({ size = 24, color = '#666' }) => (
  <MaterialIcons name="auto-fix-high" size={size} color={color} />
);

const ShoppingCartIcon = ({ size = 24, color = '#666' }) => (
  <MaterialIcons name="shopping-cart" size={size} color={color} />
);


type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [recentDesigns, setRecentDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [tokenResetDate, setTokenResetDate] = useState<Date | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadRecentDesigns = async () => {
      try {
        const result = await designStorage.getSavedDesignsPaginated(3, 0);
        setRecentDesigns(result.designs);
      } catch (error) {
        console.error('Error loading recent designs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRecentDesigns();

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();


    // Pulse animation for CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim]);

  const handleStartDesign = () => {
    navigation.navigate('Design');
  };

  const handleViewDesign = (design: SavedDesign) => {
    if (design.serviceType === 'declutter') {
      navigation.navigate('Result', {
        generatedImage: design.generatedImage,
        originalImage: design.originalImage,
        cleaningSteps: design.cleaningSteps || [],
        description: design.description,
        serviceType: 'declutter'
      });
    } else if (design.serviceType === 'makeover') {
      navigation.navigate('Result', {
        originalImage: design.originalImage,
        generatedImage: design.generatedImage,
        description: design.description,
        products: design.products || [],
        designId: design.id,
        serviceType: 'makeover'
      });
    } else {
      navigation.navigate('Result', {
        generatedImage: design.generatedImage,
        originalImage: design.originalImage,
        products: design.products || [],
        designId: design.id,
        description: design.description,
        serviceType: 'design'
      });
    }
  };

  const handleViewAllDesigns = () => {
    navigation.navigate('SavedDesigns');
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Animated Background */}
      <View style={styles.backgroundContainer}>
        <Image
          source={require('../../assets/background.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
          style={styles.backgroundGradient}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Logo */}
          <Image
            source={require('../../assets/re-vibe.png')}
            style={styles.logo}
            resizeMode="cover"
          />

          <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>
            ReVibe Your Space
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.text.secondary }]}>
            AI-Assisted Interior Design
          </Text>

          <Text style={[styles.heroDescription, { color: theme.colors.text.secondary }]}>
            Give your rooms new life with AI-powered design assistance. Upload a photo and get personalized recommendations to transform your space.
          </Text>

          {/* Welcome Message */}
          {isAuthenticated && user && (
            <Animated.View
              style={[
                styles.welcomeContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={[styles.welcomeText, { color: theme.colors.text.primary }]}>
                Welcome back, {user.name}! 👋
              </Text>
              <TokenBanner
                tokensRemaining={tokensRemaining}
                style={{ marginTop: 12, marginHorizontal: 0 }}
              />
            </Animated.View>
          )}

          {/* Main CTA - Only show for authenticated users */}
          {isAuthenticated && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.heroCTA}
                onPress={handleStartDesign}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={theme.colors.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroCTAGradient}
                >
                  <CameraIcon size={24} color="#FFFFFF" />
                  <Text style={styles.heroCTAText}>Start Designing</Text>
                  <SparkleIcon size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Auth Buttons for non-authenticated users */}
          {!isAuthenticated && (
            <Animated.View
              style={[
                styles.authSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: theme.colors.button.primary }]}
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.authButtonText, { color: theme.colors.primary.contrast }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authButton, styles.authButtonSecondary, { borderColor: theme.colors.button.secondary }]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.authButtonText, { color: theme.colors.button.secondary }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Design Examples */}
        <Animated.View
          style={[
            styles.examplesSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            See the Magic
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
            Transform any space in seconds
          </Text>

          <View style={styles.examplesGrid}>
            {[
              {
                title: 'Modern Minimalist',
                image: require('../../assets/Samples/AccentWall.png')
              },
              {
                title: 'Cozy & Warm',
                image: require('../../assets/Samples/BirthDay.png')
              },
              {
                title: 'Festive & Fun',
                image: require('../../assets/Samples/Christmas.png')
              },
              {
                title: 'Entertainment Ready',
                image: require('../../assets/Samples/FootballParty.png')
              }
            ].map((example, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.exampleCard, { backgroundColor: theme.colors.background.secondary }]}
                onPress={handleStartDesign}
                activeOpacity={0.8}
              >
                <Image
                  source={example.image}
                  style={styles.exampleImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.exampleOverlay}
                >
                  <Text style={[styles.exampleTitle, { color: '#FFFFFF' }]}>
                    {example.title}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* How it Works */}
        <Animated.View
          style={[
            styles.howItWorksSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            How it Works
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.text.secondary }]}>
            Simple, fast, and magical
          </Text>

          <View style={styles.stepsContainer}>
            {[
              {
                step: 1,
                icon: <CameraIcon size={32} color="#FFFFFF" />,
                title: 'Snap a Photo',
                description: 'Take a picture of your space'
              },
              {
                step: 2,
                icon: <MagicWandIcon size={32} color="#FFFFFF" />,
                title: 'Describe Your Vision',
                description: 'Tell us what you want to create'
              },
              {
                step: 3,
                icon: <SparkleIcon size={32} color="#FFFFFF" />,
                title: 'AI Magic Happens',
                description: 'Watch your space transform'
              },
              {
                step: 4,
                icon: <ShoppingCartIcon size={32} color="#FFFFFF" />,
                title: 'Shop & Create',
                description: 'Get products to make it real'
              }
            ].map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.button.primary }]}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                <View style={[styles.stepIcon, { backgroundColor: theme.colors.button.accent }]}>
                  {item.icon}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    minHeight: height * 0.8,
    justifyContent: 'center',
  },
  logo: {
    width: 480,
    height: 300,
    marginTop: -50,
    marginBottom: -50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  heroTitle: {
    fontSize: 35,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -2,
    lineHeight: 52,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroDescription: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    opacity: 0.8,
    maxWidth: width - 80,
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  welcomeContainer: {
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroCTA: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    marginBottom: 24,
  },
  heroCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderRadius: 25,
    gap: 12,
  },
  heroCTAText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Auth Section
  authSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  authButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // How it Works Section
  howItWorksSection: {
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stepsContainer: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    opacity: 0.7,
  },



  // Design Examples
  examplesSection: {
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  exampleCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  exampleImage: {
    width: '100%',
    height: 140,
  },
  exampleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'flex-end',
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
